var esl = require('modesl'),
utile = require('utile'),
eyes = require('eyes'),
express = require('express'),
sio = require('socket.io');

var Api = exports.Api = function(conf) {
    conf = conf || '../config.json';

    this.config = require(conf);

    this.app = express();

    this.pollBuffer = {};
    this.liveBuffer = { row_count: 0, rows: [] };
    this.hybridBuffer = {};

    this.timing = {
        poll: { last: 0, times: [], maxTimes: 120, average: 0 },
    };

    this.clients = {
        poll: {},
        live: {},
        hybrid: {}
    };
};

Api.prototype.start = function() {
    if(this.fsw) return;

    this._init();
};

Api.prototype._init = function() {
    var self = this;

    connect to freeswitch
    self.fsw = new esl.Connection(self.config.fsw.host, self.config.fsw.port, self.config.fsw.password, function() {
        self.fsw.subscribe([
            'CHANNEL_CREATE',
            'CHANNEL_CALLSTATE',
            'CHANNEL_STATE',
            'CHANNEL_EXECUTE',
            'CHANNEL_EXECUTE_COMPLETE',
            'CHANNEL_DESTROY'
        ], function() {
            //listen on API ports
            self.server = self.app.listen(self.config.server.port, self.config.server.host);
            self.io = sio.listen(self.server);

            //configure, and setup routes
            self._configure();
            self._setupRoutes();
            self._setupBuffers();
        });
    });

    //setup FSW Listeners
    if(self.config.debug) {
        self.fsw.on('esl::event::**', function(e) {
            if(e.type.indexOf('CHANNEL') === -1) return;

            eyes.inspect(e, 'Event: ' + e.getHeader('Event-Name'));
        });
    }
};

Api.prototype._configure = function() {
    //configure static directory, and SIO log level
    this.app.use(express.static('public'));
    this.io.set('log level', this.config.sioLogLevel);
};

Api.prototype._setupRoutes = function() {
    var self = this;

    //Express HTTP Routes
    self.app.get('/', function(req, res) {});

    //Socket.io Events
    self.io.on('connection', function(socket) {
        socket.on('setup', function(method, cb) {
            socket._method = method;
            self._setClientMethod(socket, method);

            //refresh hybrid
            if(method == 'hybrid') {
                self._emitToClients({ uuid: null, data: self.hybridBuffer }, self.clients.hybrid);
            }

            if(cb) cb();
        });

        socket.on('change-method', function(method, cb) {
            socket._method = method
            self._setClientMethod(socket, method);

            //refresh hybrid
            if(method == 'hybrid') {
                self._emitToClients({ uuid: null, data: self.hybridBuffer }, self.clients.hybrid);
            }

            if(cb) cb();
        });

        socket.on('get-data', function(cb) {
            if(cb) {
                cb(null, self[socket._method + 'Buffer']);
            }
        });

        socket.on('get-stats', function(cb) {
            if(cb) cb(null, self.timing);
        });

        socket.on('disconnect', function() {
            self._unsetClientMethod(socket);
        });
    });
};

Api.prototype._setupBuffers = function() {
    //poll buffer updates every 1s with full 'show' data
    this._doShowPoll();

    //live shows only updates
    this._subLiveUpdates(this.liveBuffer, this.clients.live);

    //hybrid gets a full show to start, then subscribes to live updates
    var self = this;
    self.fsw.show('channels', 'xml', function(err, data) {
        //update buffer, massage the array into an object
        //so they are keyed by uuid instead of indexes
        self.hybridBuffer.row_count = data.row_count;
        self.hybridBuffer.rows = {};
        data.rows.forEach(function(row) {
            self.hybridBuffer.rows[row.uuid] = row;
        });

        self._subLiveUpdates(self.hybridBuffer, self.clients.hybrid);
        self._emitToClients({ uuid: null, data: self.hybridBuffer }, self.clients.hybrid);
    });
};

Api.prototype._unsetClientMethod = function(socket) {
    delete this.clients.poll[socket.id];
    delete this.clients.live[socket.id];
    delete this.clients.hybrid[socket.id];
};

Api.prototype._setClientMethod = function(socket, method) {
    this._unsetClientMethod(socket);

    this.clients[method][socket.id] = socket;
};

Api.prototype._emitToClients = function(data, clients) {
    var self = this;

    //object like { 'socket_id': socket }
    utile.each(clients, function(socket) {
        socket.emit('data', data);
    });
};

Api.prototype._subLiveUpdates = function(buffer, clients) {
    var self = this;

    //subscribe to the live Channel events, and emit
    //each event's data to the client
    self.fsw.on('esl::event::CHANNEL_CREATE::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        buffer.row_count++;
        buffer.rows[id] = self._createNewChannel(evt);

        self._emitToClients({ uuid: id, data: buffer.rows[id] }, clients);
    });

    self.fsw.on('esl::event::CHANNEL_CALLSTATE::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        //can be called after being destroyed
        if(buffer.rows[id]) {
            self._updateCallState(buffer, evt, id);
            self._emitToClients({ uuid: id, data: buffer.rows[id] }, clients);
        }
    });

    self.fsw.on('esl::event::CHANNEL_STATE::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        if(buffer.rows[id]) {
            self._updateState(buffer, evt, id);
            self._emitToClients({ uuid: id, data: buffer.rows[id] }, clients);
        }
    });

    self.fsw.on('esl::event::CHANNEL_EXECUTE::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        if(buffer.rows[id]) {
            buffer.rows[id].application = evt.getHeader('Application');
            buffer.rows[id].application_data = evt.getHeader('Application-Data');
            self._emitToClients({ uuid: id, data: buffer.rows[id] }, clients);
        }
    });

    self.fsw.on('esl::event::CHANNEL_EXECUTE_COMPLETE::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        if(buffer.rows[id]) {
            buffer.rows[id].application_response = evt.getHeader('Application-Response');
            self._emitToClients({ uuid: id, data: buffer.rows[id] }, clients);
        }
    });

    self.fsw.on('esl::event::CHANNEL_DESTROY::*', function(evt) {
        var id = evt.getHeader('Unique-ID');

        buffer.row_count--;
        delete buffer.rows[id];

        self._emitToClients({ uuid: id, destroy: true }, clients);
    });
};

Api.prototype._updateState = function(buff, e, id) {
    buff.rows[id].state = e.getHeader('Channel-State');
    buff.rows[id].callstate = e.getHeader('Channel-Call-State');
    buff.rows[id].answerstate = e.getHeader('Answer-State');

    buff.rows[id].hit_dialplan = e.getHeader('Channel-HIT-Dialplan');
};

Api.prototype._updateCallState = function(buff, e, id) {
    buff.rows[id].read_codec = e.getHeader('Channel-Read-Codec-Name');
    buff.rows[id].read_rate = e.getHeader('Channel-Read-Codec-Rate');
    buff.rows[id].read_bit_rate = e.getHeader('Channel-Read-Codec-Bit-Rate');
    buff.rows[id].write_codec = e.getHeader('Channel-Write-Codec-Name');
    buff.rows[id].write_rate = e.getHeader('Channel-Write-Codec-Rate');
    buff.rows[id].write_bit_rate = e.getHeader('Channel-Write-Codec-Bit-Rate');

    this._updateState(buff, e, id);
};

Api.prototype._createNewChannel = function(e) {
    return {
        uuid: e.getHeader('Unique-ID'),
        direction: e.getHeader('Call-Direction'),
        created: e.getHeader('Event-Date-Local'),
        created_epoch: Math.floor(e.getHeader('Event-Date-Timestamp') / 1E6),
        name: e.getHeader('Channel-Name'),
        state: e.getHeader('Channel-State'),
        cid_name: e.getHeader('Caller-Callee-ID-Name') || e.getHeader('Caller-Caller-ID-Name'),
        cid_num: e.getHeader('Caller-Callee-ID-Number') || e.getHeader('Caller-Caller-ID-Number'),
        ip_addr: '',
        dest: e.getHeader('Caller-Destination-Number'),
        application: '', //in CHANNEL_EXECUTE
        application_data: '', //in CHANNEL_EXECUTE
        dialplan: null, //Not in messages
        context: e.getHeader('Caller-Context'),
        read_codec: '', //in CHANNEL_CALLSTATE
        read_rate: '', //in CHANNEL_CALLSTATE
        read_bit_rate: '', //in CHANNEL_CALLSTATE
        write_codec: '', //in CHANNEL_CALLSTATE
        write_rate: '', //in CHANNEL_CALLSTATE
        write_bit_rate: '', //in CHANNEL_CALLSTATE
        secure: null, //Not in messages
        hostname: e.getHeader('FreeSWITCH-Hostname'),
        presence_id: null, //Not in messages
        presence_data: null, //Not in messages
        callstate: '', //in CHANNEL_CALLSTATE
        callee_name: e.getHeader('Caller-Callee-ID-Name'),
        callee_num: e.getHeader('Caller-Callee-ID-Number'),
        callee_direction: null, //Not in messages
        call_uuid: e.getHeader('Channel-Call-UUID'),
        sent_callee_name: null, //Not in messages
        sent_callee_num: null //Not in messages
    };
};

Api.prototype._doShowPoll = function() {
    var self = this, poll = self.timing.poll;

    //store start time
    poll.last = Date.now();

    self.fsw.show('channels', 'xml', function(err, data, raw) {
        //capture end time for calculations later
        var end = Date.now();

        if(err) {
            console.log(err);
            return;
        }

        //update buffer, massage the array into an object
        //so they are keyed by uuid instead of indexes
        self.pollBuffer.row_count = data.row_count;
        self.pollBuffer.rows = {};
        data.rows.forEach(function(row) {
            self.pollBuffer.rows[row.uuid] = row;
        });

        //emit the data to the client
        self._emitToClients({ uuid: null, data: self.pollBuffer }, self.clients.poll);

        //calculate timings
        poll.times.push(end - poll.last);

        if(poll.times.length > poll.maxTimes)
            poll.times.shift();

        poll.average = poll.times.reduce(function(p, c) { return p + c; }, 0) / poll.times.length;

        //set wait time for next channel grab, getting as close to a
        //one second interval as we can
        var waitDiff = 1000 - poll.times[poll.times.length - 1];

        setTimeout(self._doShowPoll.bind(self), (waitDiff > 0 ? waitDiff : 1));
    });
};
