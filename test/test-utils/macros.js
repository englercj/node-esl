var assert = require('assert'),
portfinder = require('portfinder'),
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
    //macro to setup a test for a esl.Server event
    testServerConnectionEvent: function(event, channelData) {
	return {
	    topic: function(s) {
		var t = this, to;

		//setup event callback
		s.once(event, function(c, id) {
		    clearTimeout(to);

		    t.callback(c, id);
		});

		//setup timeout
		to = setTimeout(function() {
		    t.callback(new Error("Connection Timeout"));
		}, 1500);

		//create a connection
		var socket = net.connect({ port: s.port });

		if(channelData) {
		    //when esl.Connection sends 'connect' event
		    socket.on('data', function(data) {
			if(data.toString().indexOf('connect') !== -1) {
			    //write channel data to it
			    socket.write(channelData + '\n');
			    
			    //wait a tick and close
			    process.nextTick(function() {
				socket.end();
			    });
			}
		    });
		}
	    },
	    'on connection': function(conn, id) {
		assert.isFalse(conn instanceof Error, 'Should not timeout.');
	    }
	};
    },
    //wrapper to test sync and async events
    testEvent: function(data, heads, Parser) {
	return {
	    topic: macros.getEchoServerSocket(function(o) {
		o.parser = new Parser(o.socket);
		this.callback(null, o);
	    }),
	    'at once': macros.parseEvent(data, heads),
	    'async': macros.parseAsyncEvent(data, heads)
	};
    },
    //macro for testing the parsing of event text sent over a socket
    parseEvent: function(data, heads) {
	return {
	    topic: function(o) {
		var t = this;

		o.parser.once('esl::event', function(e) {
		    t.callback(null, e);
		});

		o.socket.write(data);
	    },
	    'events': function(evt) {
		//event name
		assert.equal(heads['Event-Name'], evt.getType());
		assert.equal(heads['Event-Name'], evt.type);
		assert.equal(heads['Event-Name'], evt.getHeader('Event-Name'));

		//subclass
		assert.equal(heads['Event-Subclass'], evt.getHeader('Event-Subclass'));

		//body
		assert.equal(heads._body, evt.getBody());

		//content type
		assert.equal(heads['Content-Type'], evt.getHeader('Content-Type'));
	    }
	};
    },
    parseAsyncEvent: function(data, heads) {
	var lines = data.split('\n');

	return {
	    topic: function(o) {
		var t = this;

		o.parser.once('esl::event', function(e) {
		    t.callback(null, e);
		});

		//make socket get only 1 line at a time, to test the parser
		//gleaning only parts at a time
		(function writeSocketLinesAsync(socket, lns, i) {
		    if(i === lns.length) return;

		    socket.write(lns[i] + '\n');

		    process.nextTick(function() {
			writeSocketLinesAsync(socket, lns, ++i);
		    });
		})(o.socket, lines, 0);
	    },
	    'events': function(evt) {
		//event name
		assert.equal(heads['Event-Name'], evt.getType());
		assert.equal(heads['Event-Name'], evt.type);
		assert.equal(heads['Event-Name'], evt.getHeader('Event-Name'));

		//subclass
		assert.equal(heads['Event-Subclass'], evt.getHeader('Event-Subclass'));

		//body
		assert.equal(heads._body, evt.getBody());

		//content type
		assert.equal(heads['Content-Type'], evt.getHeader('Content-Type'));
	    }
	};
    },
    //macro for creating an echo server and socket connected to it
    //useful for being able to send data to a socket listener by writing
    //to that socket
    getEchoServerSocket: function(cb) {
	return function() {
	    var t = this, o = {};

	    //create a server that echos anything written to it
	    o.server = net.createServer(function(c) {
		c.pipe(c);
	    });
	
	    //find an open port
	    portfinder.getPort(function(err, port) {
		o.port = port;

		//listen to open port
		o.server.listen(port, '127.0.0.1', function() {
		    //create a client socket to the server
		    o.socket = net.connect({ port: port }, function() {
			if(cb) cb.call(t, o);
		    });
		});
	    });
	};
    },
    getInboundConnection: function(Conn, cb) {
	return macros.getEchoServerSocket(function(o) {
            var t = this;
            o.conn = new Conn('localhost', o.port, 'ClueCon');

	    if(cb) cb.call(t, o);
	});
    }
};