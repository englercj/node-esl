var vows = require('vows'),
assert = require('assert'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),
macros = require('../test-utils/macros'),
cov = require('../test-utils/coverage'),

Connection = cov.require('../../lib/esl/connection').Connection;

vows.describe('esl.Connection').addBatch({
    'Outbound Connection Should': {
        topic: macros.getEchoServerSocket(function(o) {
            var t = this;

            o.conn = new Connection(o.socket);
            this.callback(null, o);
        }),
        'have the correct exports': function(o) {
            //is function
            assert.isFunction(Connection);

            //is instance
            assert.isTrue(o.conn instanceof Connection);

            //public low-level functions
            assert.isFunction(o.conn.socketDescriptor);
            assert.isFunction(o.conn.connected);
            assert.isFunction(o.conn.getInfo);
            assert.isFunction(o.conn.send);
            assert.isFunction(o.conn.sendRecv);
            assert.isFunction(o.conn.api);
            assert.isFunction(o.conn.bgapi);
            assert.isFunction(o.conn.sendEvent);
            assert.isFunction(o.conn.recvEvent);
            assert.isFunction(o.conn.recvEventTimed);
            assert.isFunction(o.conn.filter);
            assert.isFunction(o.conn.events);
            assert.isFunction(o.conn.execute);
            assert.isFunction(o.conn.executeAsync);
            assert.isFunction(o.conn.setAsyncExecute);
            assert.isFunction(o.conn.setEventLock);
            assert.isFunction(o.conn.disconnect);

            //public high-level functions
            assert.isFunction(o.conn.auth);
            assert.isFunction(o.conn.subscribe);
            assert.isFunction(o.conn.show);
            assert.isFunction(o.conn.originate);
            assert.isFunction(o.conn.message);

            //private functions
            assert.isFunction(o.conn._noop);
            assert.isFunction(o.conn._doExec);
            assert.isFunction(o.conn._onError);
            assert.isFunction(o.conn._onConnect);
            assert.isFunction(o.conn._onEvent);

            //var defaults
            assert.isFalse(o.conn.execAsync);
            assert.isFalse(o.conn.execLock);
            assert.isFalse(o.conn.connecting);
            assert.isFalse(o.conn.authed);
            assert.isNull(o.conn.channelData);
            assert.isEmpty(o.conn.cmdCallbackQueue);
            assert.isEmpty(o.conn.apiCallbackQueue);
        }
    },
    'Inbound Connection Should': {
        topic: macros.getEchoServerSocket(function(o) {
            var t = this;

            o.conn = new Connection('localhost', o.port, 'ClueCon');
            this.callback(null, o);
        }),
        'have the correct exports': function(o) {
            //is function
            assert.isFunction(Connection);

            //is instance
            assert.isTrue(o.conn instanceof Connection);

            //public low-level functions
            assert.isFunction(o.conn.socketDescriptor);
            assert.isFunction(o.conn.connected);
            assert.isFunction(o.conn.getInfo);
            assert.isFunction(o.conn.send);
            assert.isFunction(o.conn.sendRecv);
            assert.isFunction(o.conn.api);
            assert.isFunction(o.conn.bgapi);
            assert.isFunction(o.conn.sendEvent);
            assert.isFunction(o.conn.recvEvent);
            assert.isFunction(o.conn.recvEventTimed);
            assert.isFunction(o.conn.filter);
            assert.isFunction(o.conn.events);
            assert.isFunction(o.conn.execute);
            assert.isFunction(o.conn.executeAsync);
            assert.isFunction(o.conn.setAsyncExecute);
            assert.isFunction(o.conn.setEventLock);
            assert.isFunction(o.conn.disconnect);

            //public high-level functions
            assert.isFunction(o.conn.auth);
            assert.isFunction(o.conn.subscribe);
            assert.isFunction(o.conn.show);
            assert.isFunction(o.conn.originate);
            assert.isFunction(o.conn.message);

            //private functions
            assert.isFunction(o.conn._noop);
            assert.isFunction(o.conn._doExec);
            assert.isFunction(o.conn._onError);
            assert.isFunction(o.conn._onConnect);
            assert.isFunction(o.conn._onEvent);

            //var defaults
            assert.isFalse(o.conn.execAsync);
            assert.isFalse(o.conn.execLock);
            assert.isTrue(o.conn.connecting);
            assert.isFalse(o.conn.authed);
            assert.isNull(o.conn.channelData);
            assert.isEmpty(o.conn.cmdCallbackQueue);
            assert.isEmpty(o.conn.apiCallbackQueue);
        },
        'execute': {
            '.socketDescriptor()': function(o) {
                assert.isNull(o.conn.socketDescriptor());
            },
            '.connected()': function(o) {
                assert.isFalse(o.conn.connected());
            },
            '.getInfo()': function(o) {
                assert.isNull(o.conn.getInfo());
            },
            '.send()': {
		//for some reason if I don't specify a topic here,
		//it doesn't execute the second async test
		topic: function(o) { return null; },
                'with args': macros.testConnSend(
		    ['send me', { header1: 'val1', header2: 'val2' }],
		    'send me\nheader1: val1\nheader2: val2\n\n',
		    Connection
		),
		'without args': macros.testConnSend(['send me'], 'send me\n\n', Connection)
            }/*,
	    '.sendRecv()': {
		topic: function() { return null; },
		'should call callback': {
		    topic: macros.getInboundConnection(Connection, function(o) {
			var t = this;
			o.conn.sendRecv('auth poopy', function(evt) {
			    t.callback(o, evt);
			});

			o.conn.socket.once('data', function() {
			    o.conn.socket.write(data.event.cmdReply('accepted'));
			});
		    }),
		    'on command': function(o, evt) {
			assert.equal(evt.getHeader('Reply-Text'), '+OK accepted');
			assert.equal(evt.getHeader('Modesl-Reply-OK'), 'accepted');
		    }
		},
		'should fire esl::event::command::reply': {
		    topic: macros.getInboundConnection(Connection, function(o) {
			var t = this;
			o.conn.sendRecv('auth poopy');
			o.conn.socket.once('data', function() {
			    o.conn.socket.write(data.event.cmdReply('accepted'));
			});

			o.conn.on('esl::event::command::reply', function(evt) {
			    t.callback(o, evt);
			});
		    }),
		    'on command': function(o, evt) {
			assert.equal(evt.getHeader('Reply-Text'), '+OK accepted');
			assert.equal(evt.getHeader('Modesl-Reply-OK'), 'accepted');
		    }
		}
	    }*/
        }
    }
}).export(module);