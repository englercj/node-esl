var assert = require('assert'),
    net = require('net');

var macros = module.exports = {
    testConnSend: function(args, expected, Connection) {
        return {
            topic: macros.getInboundConnection(Connection, function(o) {
                var t = this;
                o.conn.socket.once('data', function(data) {
                    t.callback(o, data);
                });

                o.conn.send.apply(o.conn, args);//('send me', { header1: 'val1', header2: 'val2' });
            }),
            'writes correct data': function(o, data) {
                assert.equal(data, expected);//'send me\nheader1: val1\nheader2: val2\n\n');
                o.conn.socket.end();
            }
        };
    },
    nextPort: function(port) {
        return port + 1;
    },
    getServer: function(options, cb) {
        if (!cb) {
            cb = options;
            options = {};
        }

        options.port   = options.port   || 8000;
        options.host   = options.host   || null;
        options.server = options.server || net.createServer(function(){});

        function onListen() {
            options.server.removeListener('error', onError);

            cb(null, options.server)
        }

        function onError(err) {
            options.server.removeListener('listening', onListen);

            if(err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
                return cb(err);
            }

            options.port = macros.nextPort(options.port);
            macros.getServer(options, cb);
        }

        options.server.once('error', onError);
        options.server.once('listening', onListen);
        options.server.listen(options.port, options.host);
    },
    //macro for creating an echo server and socket connected to it
    //useful for being able to send data to a socket listener by writing
    //to that socket
    getEchoServerSocket: function(cb) {
        //find an open port
        macros.getServer(function(err, server) {
            if(err) return cb(err);

            //echo anything on the server connection
            server.on('connection', function(c) {
                c.pipe(c);
            });

            //create a client socket to the server
            var client = net.connect({ port: server.address().port }, function() {
                if(cb) cb(null, client, server);
            });
        });
    },
    getInboundConnection: function(Conn, cb) {
        macros.getEchoServerSocket(function(err, client, server) {
            var conn = new Conn('localhost', server.address().port, 'ClueCon');

            if(cb) cb(err, conn);
        });
    }
};
