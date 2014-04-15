var http = require('http'),
express = require('express'),
sio = require('socket.io'),
esl = require('modesl');

var Chatty = exports.Chatty = function(opts) {
    opts = opts || {};

    this.port = opts.port || 8181;
    this.host = opts.host || '0.0.0.0';
    this.provider = opts.provider || 'sms-proxy-01.bandwidthclec.com';
    this.from = opts.from || '19515529832@199.44.241.115';
    this.profile = opts.profile || 'external';

    this.app = express();

    this.config = require('../config.json');

    this.clients = {};

    this.lastSeq = 0;
};

Chatty.prototype._configure = function() {
    var self = this;

    self.app.use(express.static('public'));

    self.io.set('log level', 1);
};

Chatty.prototype._init = function() {
    var self = this;

    //self.app.get('/', function(req, res) {
        //res.render('index.html');
    //});

    self.io.on('connection', function(socket) {
        socket.on('setup', function(num, fn) {
            if(num.length === 10) num = '1' + num.toString();

            self.clients[num.toString()] = socket;
            socket.set('number', num.toString(), function() {
                fn();
            });
        });

        socket.on('sendmsg', function(msg, fn) {
            socket.get('number', function(err, num) {
                self.fsw.message({
                    to: num + '@' + self.provider,
                    from: self.from,
                    profile: self.profile,
                    body: msg
                }, function(evt) {
                    fn(evt.serialize('json'));
                });
            });
        });
    });
};

Chatty.prototype.start = function() {
    var self = this;

    self.server = self.app.listen(self.port, self.host);
    self.io = sio.listen(self.server);

    //connect to freeswitch
    self.fsw = new esl.Connection(self.config.fsw.host, self.config.fsw.port, self.config.fsw.password, function() {
        self.fsw.subscribe('MESSAGE', function() {
            self._configure();
            self._init();
        });
    });

    self.fsw.on('esl::event::**', function(evt) {
        console.log('Event:', evt);
    });

    self.fsw.on('esl::event::MESSAGE::*', function(evt) {
        var n = evt.getHeader('from_user'),
        seq = parseInt(evt.getHeader('Event-Sequence'), 10);

        //with action="fire" in the chatplan, you sometimes
        //will get the message 2 times O.o
        if(seq <= self.lastSeq) return;

        self.lastSeq = seq;

        if(self.clients[n]) {
            self.clients[n].emit('recvmsg', evt.getBody());
        }
    });

    self.fsw.on('error', function(err) {
        console.log(err);
    });
};
