var vows = require('vows'),
assert = require('assert'),
portfinder = require('portfinder'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),
macros = require('../test-utils/macros'),
cov = require('../test-utils/coverage'),

Server = cov.require('../../lib/esl/server').Server;

vows.describe('esl.Server').addBatch({
    'Should': {
        topic: function() {
            var t = this;
            portfinder.getPort(function(err, port) {
                if(err) throw err;

                var server = new Server({ port: port }, function() {
                    t.callback(null, server);
                });
            });
        },
        'have the correct exports': function(s) {
            //is function
            assert.isFunction(Server);

            //is instance
            assert.isTrue(s instanceof Server);

            //private functions
            assert.isFunction(s._onConnection);
            assert.isFunction(s._onListening);
            assert.isFunction(s._generateId);

            //var defaults
            assert.isObject(s.connections);
            assert.isNumber(s.port);
            assert.strictEqual(s.host, '127.0.0.1');
        },
        'emit': {
            topic: function(s) { return s; },
            'connection::open': macros.testServerConnectionEvent('connection::open'),
            'connection::ready': macros.testServerConnectionEvent('connection::ready', data.event.channelData),
            'connection::close': macros.testServerConnectionEvent('connection::close')
        },
        'use': {
            topic: macros.getEchoServerSocket(function(o) {
                var t = this;

                o.eslServer = new Server({ server: o.server }, function() {
                    t.callback(null, o);
                });
            }),
            'custom server instance': function(o) {
                assert.equal(o.server, o.eslServer.server);
            }
        }
    },
    'Bind events': {
        topic: function() {
            var t = this;
            portfinder.getPort(function(err, port) {
                if(err) throw err;

                var server = new Server({ port: port , myevents: true}, function() {
                    t.callback(null, server);
                });
            });
        },
        'exist': {
        topic: function(s) { return s;},
            'bindEvents': function(s) {
                assert.equal(s.bindEvents, true);
            }
        },
        'emit': {
            topic: function(s) { return s; },
            'connection::open': macros.testServerConnectionEvent('connection::open', data.event.cmdReply('ok')),
            'connection::close': macros.testServerConnectionEvent('connection::close')
        }
    }
}).export(module);

