var vows = require('vows'),
assert = require('assert'),
util = require('util'),
cov = require('./test-utils/coverage'),

esl = cov.require('../../lib/esl');

//not sure why, but ONLY IN THIS FILE 'Server' doesn't
//get set right. This only happens when vows is in non-isolate...
esl.Server = cov.require('../../lib/esl/server').Server;

vows.describe('Event Socket Library Module').addBatch({
    'Should': {
        'have the correct exports': function() {
            //global functions
            assert.isFunction(esl.eslSetLogLevel);
            assert.isFunction(esl.setLogLevel);
            assert.equal(esl.eslSetLogLevel, esl.setLogLevel);
            
            //ESL Objects
            assert.isFunction(esl.Event);
            assert.isFunction(esl.Connection);
            assert.isFunction(esl.Server);
            assert.isFunction(esl.Parser);
        },
        'properly set': {
            'log level': function() {
                esl.setLogLevel(7);
                assert.strictEqual(esl._level, 7);
            },
            'log setting': function() {
                esl.setLogLevel(7);
                assert.isTrue(esl._log);
            }
        },
        'log': {
            topic: function() {
                return new esl.Event({
                    'Event-Name': 'CUSTOM',
                    'Log-Level': 0,
                    '_body': 'Derp.'
                });
            },
            'string': function(evt) {
                esl._logger = function(msg) {
                    assert.equal(msg, evt.getBody());
                };
                
                esl.setLogLevel(5);
                esl._doLog(evt);
            },
            'debug': function(evt) {
                esl._logger = function(msg) {
                    assert.equal(msg, evt.serialize() + '\n\n' + evt.getBody());
                };

                esl.setLogLevel(7);
                esl._doLog(evt);
            }
        }
    }
}).export(module);