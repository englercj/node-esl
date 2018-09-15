var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    net = require('net'),
    xml2js = require('xml2js'),
    generateUuid = require('uuid'),
    esl = require('./esl'),
    Event = require('./Event'),
    assert = require('assert'),
    Parser = require('./Parser');

//- function(host, port, localAddress, password)
//Initializes a new instance of ESLconnection, and connects to the
// host $host on the port $port, and supplies $password to freeswitch.
//
//Intended only for an event socket in "Inbound" mode. In other words,
// this is only intended for the purpose of creating a connection to
// FreeSWITCH that is not initially bound to any particular call or channel.
//
//Does not initialize channel information (since inbound connections are
// not bound to a particular channel). In plain language, this means that
// calls to getInfo() will always return NULL.
//
//- function(fd)
//Initializes a new instance of ESLconnection, using the existing file
// number contained in $fd.
//
//Intended only for Event Socket Outbound connections. It will fail on
// Inbound connections, even if passed a valid inbound socket.
//
//The standard method for using this function is to listen for an incoming
// connection on a socket, accept the incoming connection from FreeSWITCH,
// fork a new copy of your process if you want to listen for more connections,
// and then pass the file number of the socket to new($fd).
//
//NOTE: The Connection class only supports 1 connection from FSW, the second
//  ctor option will take in a net.Socket instance (gained from net.connect or
//  on a server's connection event). For multiple connections use esl.Server
var Connection = module.exports = function() {
    EventEmitter2.call(this, {
        wildcard: true,
        delimiter: '::',
        maxListeners: 25
    });

    var len = arguments.length, self = this;

    //check if they passed a ready callback
    this.once('esl::ready', ((typeof arguments[len - 1] === 'function') ? arguments[len - 1] : this._noop));

    //reasonable defaults for values
    this.execAsync = false;
    this.execLock = false;
    this.connecting = true;
    this.authed = false;
    this.channelData = null;
    this.cmdCallbackQueue = [];
    this.apiCallbackQueue = [];

    //reconnect variables for inbound connections
    this.reconnectOpts = {} ;
    this.reconnectVars = {} ;

    //events required for the module to operate properly
    this.reqEvents = ['BACKGROUND_JOB', 'CHANNEL_EXECUTE_COMPLETE'];
    this.listeningEvents = [];

    //"Inbound" connection (going into FSW)
    if(len > 2 && len < 6) { 
        //3 (host, port, password ); 
        //4 (host, port, password, localAddress | callback); 
        //5 (host, port, password, localAddress, callback)
        
        //set inbound to true
        this._inbound = true;

        //save password
        this.password = arguments[2];

        this.connectOpts = {
            port: arguments[1],
            host: arguments[0]
        } ;
        if( len > 3 && 'string' === typeof arguments[3] ) {
            this.connectOpts.localAddress = arguments[3] ;
        }

        //connect to ESL Socket
        this.socket = net.createConnection(this.connectOpts, this._onConnect.bind(this));
        this.socket.setKeepAlive(true);

        //this.installListeners() ;
        this.socket.on('error', this._onError.bind(this));
    }
    //"Outbound" connection (coming from FSW)
    else if(len >= 1) { //1 (net.Socket); 2 (net.Socket, callback)
        //set inbound to false
        this._inbound = false;

        this.socket = arguments[0];
        this.connecting = false;
        this._onConnect();

        this.send('connect');

        this.once('esl::event::CHANNEL_DATA::**', function() {
            self.subscribe(self.reqEvents, function() {
                self.emit('esl::ready');
            });
        });

        this.socket.on('error', this._onError.bind(this));
    }
    //Invalid arguments passed
    else { //0 args, or more than 4
        this.emit('error', new Error('Bad arguments passed to esl.Connection'));
    }

    //emit end when stream closes
    this.socket.on('end', () => {
        self.emit('esl::end');
        self.socket = null;
        if (this._inbound) {
            this._onConnectionGone();
        }
    });

    //handle logdata events
    this.on('esl::event::logdata', function(log) {
        esl._doLog(log);
    });

    //handle command reply callbacks
    this.on('esl::event::command::reply', function() {
        if(self.cmdCallbackQueue.length === 0) return;

        var fn = self.cmdCallbackQueue.shift();

        if(fn && typeof fn === 'function')
            fn.apply(self, arguments);
    });

    //handle api response callbacks
    this.on('esl::event::api::response', function() {
        if(self.apiCallbackQueue.length === 0) return;

        var fn = self.apiCallbackQueue.shift();

        if(fn && typeof fn === 'function')
            fn.apply(self, arguments);
    });
};

util.inherits(Connection, EventEmitter2);

/*********************
 ** Lower-level ESL Specification
 ** http://wiki.freeswitch.org/wiki/Event_Socket_Library
 **********************/

//Returns the UNIX file descriptor for the connection object,
// if the connection object is connected. This is the same file
// descriptor that was passed to new($fd) when used in outbound mode.
Connection.prototype.socketDescriptor = function() {
    if(this._inbound) return null;

    return this.socket;
};

//Test if the connection object is connected. Returns `true` if connected, `false` otherwise.
Connection.prototype.connected = function() {
    return (!this.connecting && !!this.socket);
};

//When FS connects to an "Event Socket Outbound" handler, it sends
// a "CHANNEL_DATA" event as the first event after the initial connection.
// getInfo() returns an ESLevent that contains this Channel Data.
//
//getInfo() returns NULL when used on an "Event Socket Inbound" connection.
Connection.prototype.getInfo = function() {
    return this.channelData; //remains null on Inbound socket
};

//Sends a command to FreeSWITCH.
//
//Does not wait for a reply. You should immediately call recvEvent
// or recvEventTimed in a loop until you get the reply. The reply
// event will have a header named "content-type" that has a value
// of "api/response" or "command/reply".
//
//To automatically wait for the reply event, use sendRecv() instead of send().
//
//NOTE: This is a FAF method of sending a command
Connection.prototype.send = function(command, args) {
    var self = this;

    //write raw command to socket
    try {
        self.socket.write(command + '\n');
        if(args) {
            Object.keys(args).forEach(function(key) {
                self.socket.write(key + ': ' + args[key] + '\n');
            });
        }
        self.socket.write('\n');
    }
    catch(e) {
        self.emit('error', e);
    }
};

//Internally sendRecv($command) calls send($command) then recvEvent(),
// and returns an instance of ESLevent.
//
//recvEvent() is called in a loop until it receives an event with a header
// named "content-type" that has a value of "api/response" or "command/reply",
// and then returns it as an instance of ESLevent.
//
//Any events that are received by recvEvent() prior to the reply event are queued
// up, and will get returned on subsequent calls to recvEvent() in your program.
//
//NOTE: This listens for a response when calling `.send()` doing recvEvent() in a loop
//  doesn't make sense in the contet of Node.
Connection.prototype.sendRecv = function(command, args, cb) {
    if(typeof args === 'function') {
        cb = args;
        args = null;
    }

    //queue callback for command reply
    this.cmdCallbackQueue.push(cb);

    this.send(command, args);
};

//Send an API command (http://wiki.freeswitch.org/wiki/Mod_commands#Core_Commands)
// to the FreeSWITCH server. This method blocks further execution until
// the command has been executed.
//
//api($command, $args) is identical to sendRecv("api $command $args").
Connection.prototype.api = function(command, args, cb) {
    if(typeof args === 'function') {
        cb = args;
        args = '';
    }

    if(args instanceof Array)
        args = args.join(' ');

    args = (args ? ' ' + args : '');

    //queue callback for api response
    this.apiCallbackQueue.push(cb);

    this.send('api ' + command + args);
};

//Send a background API command to the FreeSWITCH server to be executed in
// it's own thread. This will be executed in it's own thread, and is non-blocking.
//
//bgapi($command, $args) is identical to sendRecv("bgapi $command $args")
Connection.prototype.bgapi = function(command, args, jobid, cb) {
    if(typeof args === 'function') {
        cb = args;
        args = '';
        jobid = null;
    }

    if(typeof jobid === 'function') {
        cb = jobid;
        jobid = null;
    }

    args = args || ''; //incase they pass null/false

    if(args instanceof Array)
        args = args.join(' ');

    args = ' ' + args;

    jobid = jobid || generateUuid.v4();

    var self = this,
        params = {},
        addToFilter = function(cb) { if(cb) cb(); },
        removeFromFilter = addToFilter,
        sendApiCommand = function(cb) {
            params['Job-UUID'] = jobid;

            addToFilter(function() {
                if(cb) {
                    self.once('esl::event::BACKGROUND_JOB::' + jobid, function(evt) {
                        removeFromFilter(function() {
                            cb(evt);
                        });
                    });
                } else {
                    removeFromFilter();
                }
                self.sendRecv('bgapi ' + command + args, params);
            });
        };

    if(self.usingFilters) {

        addToFilter = function(cb) {
            self.filter('Job-UUID', jobid, cb);
        };
        removeFromFilter = function(cb) {
            self.filterDelete('Job-UUID', jobid, cb);
        };

        sendApiCommand(cb);
    }
    else {
        sendApiCommand(cb);
    }
};

//NOTE: This is a wrapper around sendRecv, that uses an ESLevent for the data
Connection.prototype.sendEvent = function(event, cb) {
    this.sendRecv('sendevent ' + event.getHeader('Event-Name') + '\n' + event.serialize(), cb);
};

//Returns the next event from FreeSWITCH. If no events are waiting, this
// call will block until an event arrives.
//
//If any events were queued during a call to sendRecv(), then the first
// one will be returned, and removed from the queue. Otherwise, then next
// event will be read from the connection.
//
//NOTE: This is the same as `connection.once('esl::event::**', ...)` and in fact
//  that is all it does. It does not block as the description says, nor does
//  it queue events. Node has a better Event system than this, use it.
Connection.prototype.recvEvent = function(cb) {
    cb = cb || this._noop;

    this.once('esl::event::**', cb);
};

//Similar to recvEvent(), except that it will block for at most $milliseconds.
//
//A call to recvEventTimed(0) will return immediately. This is useful for polling for events.
//
//NOTE: This does the same as recvEvent, except will timeout if an event isn't received in
//  the specified timeframe
Connection.prototype.recvEventTimed = function(ms, cb) {
    var self = this, timeout, fn;

    fn = function(to, event) {
        clearTimeout(to);
        if(cb) cb(event);
    };

    timeout = setTimeout(function() {
        self.removeListener('esl::event::**', fn);
        if(cb) cb();
    }, ms);

    //proxy to ensure we pass this timeout to the callback
    self.once('esl::event::**', fn.bind(self, timeout));
};

//See the event socket filter command (http://wiki.freeswitch.org/wiki/Event_Socket#filter).
Connection.prototype.filter = function(header, value, cb) {
    this.usingFilters = true;
    this.sendRecv('filter ' + header + ' ' + value, cb);
};

Connection.prototype.filterDelete = function(header, value, cb) {
    if(typeof value === 'function') {
        cb = value;
        value = null;
    }

    this.sendRecv('filter delete ' + header + (!!value ? ' ' + value : ''), cb);
};

//$event_type can have the value "plain" or "xml" or "json". Any other value specified
// for $event_type gets replaced with "plain".
//
//See the event socket event command for more info (http://wiki.freeswitch.org/wiki/Event_Socket#event).
Connection.prototype.events = function(type, events, cb) {
    if(['plain','xml','json'].indexOf(type) === -1)
        type = 'plain';

    if(typeof events === 'function') {
        cb = events;
        events = 'all';
    }

    events = events || 'all';

    var all =  false;
    if(events instanceof Array)
        all = (events.length === 1 && events[0].toLowerCase() === 'all');
    else
        all = (events.toLowerCase() === 'all');

    //if we specify all that includes required events
    if(all) {
        this.listeningEvents = ['all'];
    }
    //otherwise we need to concat the events to the required events
    else {
        //set listeningEvents to the new events
        this.listeningEvents = (events instanceof Array ? events : events.split(' '));

        //if the required events are not in there, add them
        for(var i = 0, len = this.reqEvents.length; i < len; ++i) {
            if(this.listeningEvents.indexOf(this.reqEvents[i]) !== -1)
                continue;

            this.listeningEvents.push(this.reqEvents[i]);
        }
    }

    this.sendRecv('event ' + type + ' ' + this.listeningEvents.join(' '), cb);
};

//Execute a dialplan application (http://wiki.freeswitch.org/wiki/Mod_dptools#Applications),
// and wait for a response from the server.
// On socket connections not anchored to a channel (most of the time inbound),
// all three arguments are required -- $uuid specifies the channel to execute
// the application on.
//
//Returns an ESLevent object containing the response from the server. The
// getHeader("Reply-Text") method of this ESLevent object returns the server's
// response. The server's response will contain "+OK [Success Message]" on success
// or "-ERR [Error Message]" on failure.
Connection.prototype.execute = function(app, arg, uuid, cb) {
    var self = this, opts = {};

    if(typeof arg === 'function') {
        cb = arg;
        arg = '';
    }

    if(typeof uuid === 'function') {
        cb = uuid;
        uuid = null;
    }
    cb = cb || function (){};

    //setup options
    opts['execute-app-name'] = app;
    if( typeof arg !== 'undefined') { opts['execute-app-arg'] = arg; }

    var eventUuid ;
    //if inbound
    if(self._inbound) {
        //if no uuid passed, create one
        uuid = uuid || generateUuid.v4();

        //execute with the new uuid
        eventUuid = self._doExec(uuid, 'execute', opts, cb);
    }
    //if outbound
    else {
        //grab our unique-id from channel_data
        uuid = self.getInfo().getHeader('Unique-ID');
        eventUuid = self._doExec(uuid, 'execute', opts, cb);
    }
    return eventUuid ;
};

//Same as execute, but doesn't wait for a response from the server.
//
//This works by causing the underlying call to execute() to append
// "async: true" header in the message sent to the channel.
Connection.prototype.executeAsync = function(app, arg, uuid, cb) {
    //temporarily set async to true
    var old = this.execAsync;
    this.execAsync = true;

    //run execute
    var eventUuid = this.execute(app, arg, uuid, cb);

    //reset async
    this.execAsync = old;

    return eventUuid ;
};

//Force async mode on for a socket connection. This command has
// no effect on outbound socket connections that are set to "async"
// in the dialplan and inbound socket connections, since these
// connections are already set to async mode on.
//
//$value should be `true` to force async mode, and `false` to not force it.
//
//Specifically, calling setAsyncExecute(true) operates by causing future calls
// to execute() to include the "async: true" header in the message sent to
// the channel. Other event socket library routines are not affected by this call.
//
Connection.prototype.setAsyncExecute = function(value) {
    this.execAsync = value;
};

//Force sync mode on for a socket connection. This command has no effect on
// outbound socket connections that are not set to "async" in the dialplan,
// since these connections are already set to sync mode.
//
//$value should be `true` to force sync mode, and `false` to not force it.
//
//Specifically, calling setEventLock(1) operates by causing future calls to
// execute() to include the "event-lock: true" header in the message sent
// to the channel. Other event socket library routines are not affected by this call.
//
//See Also:
// Q: Ordering and async keyword
//      (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Ordering_and_async_keyword)
// Q: Can I bridge a call with an Outbound Socket?
//      (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Can_I_bridge_a_call_with_an_Outbound_socket_.3F)
Connection.prototype.setEventLock = function(value) {
    this.execLock = value;
};

//Close the socket connection to the FreeSWITCH server.
Connection.prototype.disconnect = function() {
    this.send('exit');
    this.closing = true;

    if (this.socket) {
        this.socket.end();
        this.socket = null;
    }
};

/*********************
 ** Higher-level Library-Specific Functions
 ** Some of these simply provide syntatic sugar
 **********************/
Connection.prototype.auth = function(cb) {
    var self = this;

    //send auth command
    self.sendRecv('auth ' + self.password, function(evt) {
        if(evt.getHeader('Modesl-Reply-OK') === 'accepted') {
            self.authed = true;

            self.subscribe(self.reqEvents);

            self.emit('esl::event::auth::success', evt);
            self.emit('esl::ready');

            if(cb && typeof cb === 'function') cb(null, evt);
        } else {
            self.authed = false;
            self.emit('esl::event::auth::fail', evt);

            if(cb && typeof cb === 'function') cb(new Error('Authentication Failed'), evt);
        }
    });
};

//subscribe to events using json format (native support)
Connection.prototype.subscribe = function(events, cb) {
    events = events || 'all';

    this.events('json', events, cb);
};

//wraps the show mod_commands function and parses the return
//value into a javascript array
Connection.prototype.show = function(item, format, cb) {
    if(typeof format === 'function') {
        cb = format;
        format = null;
    }

    format = format || 'json';

    this.bgapi('show ' + item + ' as ' + format, function(e) {
        var data = e.getBody(), parsed = {};

        //if error send them that
        if(data.indexOf('-ERR') !== -1) {
            if(cb) cb(new Error(data));
            return;
        }

        //otherwise parse the event
        switch(format) {
        case 'json': //json format, easy and efficient
            try { parsed = JSON.parse(data); }
            catch(e) { if(cb) cb(e); return; }

            if(!parsed.rows) parsed.rows = [];

            break;

        case 'xml': //xml format, need to massage a bit after parsing
            var parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false, emptyTag: '' });

            parser.parseString(data, function(err, doc) {
                if(err) { if(cb) cb(err); return; }
                // jshint -W106
                parsed.rowCount = parseInt(doc.$.row_count, 10);
                // jshint +W106
                parsed.rows = [];

                //case where only one row, means "row" is not an array
                if(parsed.rowCount === 1) {
                    delete doc.row.$;
                    parsed.rows.push(doc.row);
                } else if(parsed.rowCount > 1) {
                    doc.row.forEach(function(row) {
                        delete row.$;
                        parsed.rows.push(row);
                    });
                }
            });
            break;

        default: //delim seperated values, custom parsing
            if(format.indexOf('delim')) {
                var delim = format.replace('delim ', ''),
                lines = data.split('\n'),
                cols = lines[0].split(delim);

                parsed = { rowCount: lines.length - 1, rows: [] };

                for(var i = 1, len = lines.length; i < len; ++i) {
                    var vals = lines[i].split(delim),
                    o = {};
                    for(var x = 0, xlen = vals.length; x < xlen; ++x) {
                        o[cols[x]] = vals[x];
                    }

                    parsed.rows.push(o);
                }
            }
            break;
        }

        //return the parsed version of the data
        if(cb) cb(null, parsed, data);
        return;
    });
};

//make an originating call
Connection.prototype.originate = function(options, cb) {
    if(typeof options === 'function') {
        cb = options;
        options = null;
    }

    options.profile = options.profile || '';
    options.gateway = options.gateway || '';
    options.number  = options.number || '';
    options.app     = options.app || '';
    options.sync    = options.sync || false;

    var arg = 'sofia/' + options.profile +
                '/' + options.number +
                '@' + options.gateway +
                (options.app ? ' &' + options.app : '');

    if(options.sync) {
        this.api('originate', arg, cb);
    } else {
        this.bgapi('originate', arg, cb);
    }
};

//send a SIP MESSAGE
Connection.prototype.message = function(options, cb) {
    if(typeof options === 'function') {
        cb = options;
        options = null;
    }

    options = options || {};

    options.to      = options.to || '';
    options.from    = options.from || '';
    options.profile = options.profile || '';
    options.body    = options.body || '';
    options.subject = options.subject || '';
    options.deliveryConfirmation = options.deliveryConfirmation || '';

    var event = new Event('custom', 'SMS::SEND_MESSAGE');

    event.addHeader('proto', 'sip');
    event.addHeader('dest_proto', 'sip');

    event.addHeader('from', 'sip:' + options.from);
    event.addHeader('from_full', 'sip:' + options.from);

    event.addHeader('to', options.to);
    event.addHeader('sip_profile', options.profile);
    event.addHeader('subject', options.subject);

    if(options.deliveryConfirmation) {
        event.addHeader('blocking', 'true');
    }

    event.addHeader('type', 'text/plain');
    event.addHeader('Content-Type', 'text/plain');

    event.addBody(options.body);

    this.sendEvent(event, cb);
};


/*********************
 ** Private helpers
 **********************/
//noop because EventEmitter2 makes me pass a function
Connection.prototype._noop = function() {};

//helper for execute, sends the actual message
Connection.prototype._doExec = function(uuid, cmd, args, cb) {
    args['call-command'] = cmd;

    if(this.execAsync) args.async = true;
    if(this.execLock) args['event-lock'] = true;

    //this method of event tracking is based on:
    //http://lists.freeswitch.org/pipermail/freeswitch-users/2013-May/095329.html
    args['Event-UUID'] = generateUuid.v4();

    var eventName = 'esl::event::CHANNEL_EXECUTE_COMPLETE::' + uuid;
    var cbWrapper = (evt) => {
        var evtUuid = evt.getHeader('Application-UUID') || evt.getHeader('Event-UUID');

        if (args['Event-UUID'] === evtUuid) {
            this.removeListener(eventName, cbWrapper);
            cb(evt);
        }
    };

    this.on(eventName, cbWrapper);

    this.send('sendmsg ' + uuid, args);

    return args['Event-UUID'] ;
};

//called on socket/generic error, simply echo the error
//to the user
Connection.prototype._onError = function(err) {
    this.emit('error', err);
    if (this._inbound && !this.closing) {
        this._onConnectionGone();
    }
};


//called when socket connects to FSW ESL Server
//or when we successfully listen to the fd
Connection.prototype._onConnect = function() {

    //initialize parser
    this.parser = new Parser(this.socket);

    //on generic event
    this.parser.on('esl::event', this._onEvent.bind(this));

    //on parser error
    this.parser.on('error', this._onError.bind(this));

    //emit that we connected
    this.emit('esl::connect');
    this.connecting = false;

    //wait for auth request
    this.on('esl::event::auth::request', this.auth.bind(this));

    if (this._inbound) {
        // set up reconnection stuff
        this.initializeRetryVars() ;
    }
};

//When we get a generic ESLevent from FSW
Connection.prototype._onEvent = function(event, headers, body) {
    var emit = 'esl::event',
        uuid = event.getHeader('Job-UUID') || event.getHeader('Unique-ID') || event.getHeader('Core-UUID');

    //massage Content-Types into event names,
    //since not all events actually have an Event-Name
    //header; we have to make our own
    switch(headers['Content-Type']) {
    case 'auth/request':
        emit += '::auth::request';
        break;

    case 'command/reply':
        emit += '::command::reply';

        if(headers['Event-Name'] === 'CHANNEL_DATA') {
            if(!this._inbound) {
                this.channelData = event;
                this.emit('esl::event::CHANNEL_DATA' + (!!uuid ? '::' + uuid : ''), event);
            }
        }
        break;

    case 'log/data':
        emit += '::logdata';
        break;

    case 'text/disconnect-notice':
        emit += '::disconnect::notice';
        break;

    case 'api/response':
        emit += '::api::response';
        break;


    case 'text/event-json':
    case 'text/event-plain':
    case 'text/event-xml':
        emit += '::' + event.getHeader('Event-Name') + (!!uuid ? '::' + uuid : '');
        break;

    default:
        emit += '::raw::' + headers['Content-Type'];
    }

    this.emit(emit, event, headers, body);
};

Connection.prototype.initializeRetryVars = function() {
    this.reconnectVars.retryTimer = null;
    this.reconnectVars.retryTotaltime = 0;
    this.reconnectVars.retryDelay = 150;
    this.reconnectVars.retryBackoff = 1.7;
    this.reconnectVars.attempts = 1;
}

Connection.prototype._onConnectionGone = function() {
    assert(this._inbound);

    // If a retry is already in progress, just let that happen
    if (this.reconnectVars.retryTimer) {
      return;
    }

    // If this is a requested shutdown, then don't retry
    if (this.closing) {
        this.reconnectVars.retryTimer = null;
        return;
    }

    const nextDelay = Math.floor(this.reconnectVars.retryDelay * this.reconnectVars.retryBackoff);
    if (this.reconnectOpts.retryMaxDelay !== null && nextDelay > this.reconnectOpts.retryMaxDelay) {
        this.reconnectVars.retryDelay = this.reconnectOpts.retryMaxDelay;
    } else {
        this.reconnectVars.retryDelay = nextDelay;
    }

    if (this.reconnectOpts.maxAttempts && this.reconnectVars.attempts >= this.reconnectOpts.maxAttempts) {
        this.reconnectVars.retryTimer = null;
        return;
    }

    this.reconnectVars.attempts += 1;
    this.emit('esl::reconnecting', {
        delay: this.reconnectVars.retryDelay,
        attempt: this.reconnectVars.attempts
    });
    this.reconnectVars.retryTimer = setTimeout(() => {
        this.reconnectVars.retryTotaltime += this.reconnectVars.retryDelay;

        if (this.reconnectOpts.connectTimeout && this.reconnectVars.retryTotaltime >= this.reconnectOpts.connectTimeout) {
                this.reconnectVars.retryTimer = null;
                console.error('Connection#_onConnectionGone: ' +
                    `Couldn't get freeswitch connection after ${this.reconnectVars.retryTotaltime} ms`);
                return;
        }
        this.socket = net.createConnection(this.connectOpts, this._onConnect.bind(this));
        this.socket.setKeepAlive(true);
        this.socket.on('error', this._onError.bind(this));
        //emit end when stream closes
        this.socket.on('end', () => {
            this.emit('esl::end');
            this.socket = null;
            this._onConnectionGone();
        });

      this.reconnectVars.retryTimer = null;
    }, this.reconnectVars.retryDelay);
  }
