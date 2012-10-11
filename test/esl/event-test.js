var vows = require('vows'),
assert = require('assert'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),

cov = require('../test-utils/coverage'),

Event = cov.require('../../lib/esl/event').Event;

vows.describe('esl.Event').addBatch({
    'Should': {
        topic: function() {
            return new Event();
        },
        'have the correct exports': function(evt) {
            //object level properties
            assert.isFunction(Event);
            assert.isObject(Event.PRIORITY);
            assert.equal('LOW', Event.PRIORITY.LOW);
            assert.equal('NORMAL', Event.PRIORITY.NORMAL);
            assert.equal('HIGH', Event.PRIORITY.HIGH);

            //instance public functions
            assert.isFunction(evt.serialize);
            assert.isFunction(evt.setPriority);
            assert.isFunction(evt.getHeader);
            assert.isFunction(evt.getBody);
            assert.isFunction(evt.getType);
            assert.isFunction(evt.addBody);
            assert.isFunction(evt.addHeader);
            assert.isFunction(evt.delHeader);
            assert.isFunction(evt.firstHeader);
            assert.isFunction(evt.nextHeader);

            //instance private functions
            assert.isFunction(evt._findHeaderIndex);
            assert.isFunction(evt._findHeader);

            //instance variables
            assert.isArray(evt.headers);
            assert.isNull(evt.hPtr);
            assert.isString(evt.type);
            //assert.isString(evt.subclass);
            assert.isString(evt.body);
        },
        'properly construct with': {
            '()': function() {
                var e = new Event();

                assert.isEmpty(e.getType());
                assert.isEmpty(e.type);

                assert.isNull(e.getHeader('Event-Name'));

                assert.isEmpty(e.getBody());
            },
            '(type)': function() {
                var e = new Event(heads['Event-Name']);

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);
                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));

                assert.isEmpty(e.getBody());
            },
            '(type, subclass)': function() {
                var e = new Event(heads['Event-Name'], heads['Event-Subclass']);

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);
                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));

                assert.equal(heads['Event-Subclass'], e.subclass);
                assert.equal(heads['Event-Subclass'], e.getHeader('Event-Subclass'));

                assert.isEmpty(e.getBody());
            },
            '(headers)': function() {
                var e = new Event({ 'Event-Name': heads['Event-Name'], 'Reply-Text': '+OK' });

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);

                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal('+OK', e.getHeader('Reply-Text'));

                assert.isEmpty(e.getBody());
            },
            '(headers [with Event-Subclass])': function() {
                var e = new Event({
                    'Event-Name': heads['Event-Name'],
                    'Reply-Text': '+OK',
                    'Event-Subclass': heads['Event-Subclass']
                });

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);
                assert.equal(heads['Event-Subclass'], e.subclass);

                assert.equal(heads['Event-Subclass'], e.getHeader('Event-Subclass'));
                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal('+OK', e.getHeader('Reply-Text'));

                assert.isEmpty(e.getBody());
            },
            '(headers [with _body])': function() {
                var e = new Event({
                    'Event-Name': heads['Event-Name'],
                    'Reply-Text': '+OK',
                    '_body': 'some body here'
                });

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);

                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal('+OK', e.getHeader('Reply-Text'));

                assert.equal('some body here', e.getBody());
            },
            '(headers, body)': function() {
                var e = new Event({
                    'Event-Name': heads['Event-Name'],
                    'Reply-Text': '+OK'
                }, 'some body here');

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);

                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal('+OK', e.getHeader('Reply-Text'));

                assert.equal('some body here', e.getBody());
            },
            '(headers [with _body], body)': function() {
                var e = new Event({
                    'Event-Name': heads['Event-Name'],
                    'Reply-Text': '+OK',
                    '_body': 'skip me'
                }, 'some body here');

                assert.equal(heads['Event-Name'], e.getType());
                assert.equal(heads['Event-Name'], e.type);

                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal('+OK', e.getHeader('Reply-Text'));
                assert.isNull(e.getHeader('_body'));

                assert.equal('some body here', e.getBody());
            }
        }
    },
    'Executing': {
        '.serialize() should': {
            'into': {
                topic: function() {
                    return new Event(heads);
                },
                'json': function(e) {
                    assert.equal(data.event.json, e.serialize('json'));
                },
                'plain': function(e) {
                    assert.equal(data.event.plain, e.serialize());
                    assert.equal(e.serialize('plain'), e.serialize());
                },
                'xml': function(e) {
                    assert.equal(data.event.xml, e.serialize('xml'));
                }
            }
        },
        '.setPriority() should': {
            'set priority header': function() {
                var e = new Event(heads);

                e.setPriority(Event.PRIORITY.HIGH);

                assert.equal(Event.PRIORITY.HIGH, e.getHeader('priority'));
            }
        },
        '.getHeader() should': {
            'return correct values': function() {
                var e = new Event(heads);

                assert.equal(heads['Event-Name'], e.getHeader('Event-Name'));
                assert.equal(heads['Core-UUID'], e.getHeader('Core-UUID'));
                assert.equal(heads['Event-Date-Timestamp'], e.getHeader('Event-Date-Timestamp'));
            }
        },
        '.getBody() should': {
            'return current body': function() {
                var e = new Event(heads);

                assert.equal(heads._body, e.getBody());
            }
        },
        '.getType() should': {
            'return message name': function() {
                var e = new Event(heads);

                assert.equal(heads['Event-Name'], e.getType());
            }
        },
        '.addBody() should': {
            'append body': function() {
                var e = new Event(heads);

                e.addBody('MOAR BODY');

                assert.equal(heads._body + 'MOAR BODY', e.getBody());
            }
        },
        '.addHeader() should': {
            topic: function() {
                return new Event(heads);
            },
            'add new headers': function(e) {
                assert.isNull(e.getHeader('MyHeader'));

                e.addHeader('MyHeader', 'value');

                assert.equal('value', e.getHeader('MyHeader'));
            },
            'replace existing headers': function(e) {
                assert.equal('None', e.getHeader('subject'));

                e.addHeader('subject', 'Some');

                assert.equal('Some', e.getHeader('subject'));
            }
        },
        '.delHeader() should': {
            'remove headers': function() {
                var e = new Event(heads);

                assert.equal('None', e.getHeader('subject'));

                e.delHeader('subject');

                assert.isNull(e.getHeader('subject'));
                assert.doesNotThrow(e.delHeader.bind(e, 'subject'), Error);
            }
        },
        '.firstHeader() should': {
            'move ptr to first header and return its key': function() {
                var e = new Event(heads), key;

                assert.isNull(e.hPtr);

                key = e.firstHeader();

                assert.strictEqual(0, e.hPtr);
                assert.equal(e.headers[0].name, key);
            }
        },
        '.nextHeader() should': {
	    'return null if no firstHeader() call yet': function() {
                var e = new Event(heads);

		assert.isNull(e.hPtr);
		assert.isNull(e.nextHeader());
	    },
	    'return null if at the end of Headers': function() {
		var e = new Event(heads), len = Object.keys(heads).length - 1; //dont count _body

		//init ptr
		e.firstHeader();

		//go through each header
		for(var i = 0; i <= len; ++i) {
		    e.nextHeader();
		}

		//should now be at end
		assert.isNull(e.nextHeader());
	    },
            'move ptr to next header and return its key': function() {
                var e = new Event(heads), key;

                //must call firstHeader before using nextHeader
                e.firstHeader();

                assert.strictEqual(0, e.hPtr);

                key = e.nextHeader();

                assert.strictEqual(1, e.hPtr);
                assert.equal(e.headers[1].name, key);
            }
        }
    }
}).export(module);