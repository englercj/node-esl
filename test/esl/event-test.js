var vows = require('vows'),
assert = require('assert'),
cov = require('../coverage'),

Event = cov.require('../lib/esl/event').Event,

data = {
    'Event-Name': 'CUSTOM',
    'Core-UUID': '8b192020-7368-4498-9b11-cbe10f48a784',
    'FreeSWITCH-Hostname': 'smsdev',
    'FreeSWITCH-Switchname': 'smsdev',
    'FreeSWITCH-IPv4': '127.0.0.1',
    'FreeSWITCH-IPv6': '::1',
    'Event-Date-Local': '2012-09-25 14:22:37',
    'Event-Date-GMT': 'Tue, 25 Sep 2012 18:22:37 GMT',
    'Event-Date-Timestamp': '1348597357036551',
    'Event-Calling-File': 'switch_cpp.cpp',
    'Event-Calling-Function': 'Event',
    'Event-Calling-Line-Number': '262',
    'Event-Sequence': '11027',
    'Event-Subclass': 'SMS::SEND_MESSAGE',
    'proto': 'sip',
    'dest_proto': 'sip',
    'from': '##########',
    'from_full': '##########',
    'to': 'internal/##########@zip-zop-bobity-boop.com',
    'subject': 'None',
    'type': 'text/plain',
    'hint': 'the hint',
    'replying': 'true',
    'Content-Length': 23,
    '_body': 'Hello from Chad Engler!'
},
dataPlain = [
    'Event-Name: CUSTOM',
    'Core-UUID: 8b192020-7368-4498-9b11-cbe10f48a784',
    'FreeSWITCH-Hostname: smsdev',
    'FreeSWITCH-Switchname: smsdev',
    'FreeSWITCH-IPv4: 127.0.0.1',
    'FreeSWITCH-IPv6: ::1',
    'Event-Date-Local: 2012-09-25 14:22:37',
    'Event-Date-GMT: Tue, 25 Sep 2012 18:22:37 GMT',
    'Event-Date-Timestamp: 1348597357036551',
    'Event-Calling-File: switch_cpp.cpp',
    'Event-Calling-Function: Event',
    'Event-Calling-Line-Number: 262',
    'Event-Sequence: 11027',
    'Event-Subclass: SMS::SEND_MESSAGE',
    'proto: sip',
    'dest_proto: sip',
    'from: ##########',
    'from_full: ##########',
    'to: internal/##########@zip-zop-bobity-boop.com',
    'subject: None',
    'type: text/plain',
    'hint: the hint',
    'replying: true',
    'Content-Length: 23',
    '',
    'Hello from Chad Engler!'
].join('\n'),
dataXml = [
    '<event>',
    '  <headers>',
    '    <Event-Name>CUSTOM</Event-Name>',
    '    <Core-UUID>8b192020-7368-4498-9b11-cbe10f48a784</Core-UUID>',
    '    <FreeSWITCH-Hostname>smsdev</FreeSWITCH-Hostname>',
    '    <FreeSWITCH-Switchname>smsdev</FreeSWITCH-Switchname>',
    '    <FreeSWITCH-IPv4>127.0.0.1</FreeSWITCH-IPv4>',
    '    <FreeSWITCH-IPv6>::1</FreeSWITCH-IPv6>',
    '    <Event-Date-Local>2012-09-25 14:22:37</Event-Date-Local>',
    '    <Event-Date-GMT>Tue, 25 Sep 2012 18:22:37 GMT</Event-Date-GMT>',
    '    <Event-Date-Timestamp>1348597357036551</Event-Date-Timestamp>',
    '    <Event-Calling-File>switch_cpp.cpp</Event-Calling-File>',
    '    <Event-Calling-Function>Event</Event-Calling-Function>',
    '    <Event-Calling-Line-Number>262</Event-Calling-Line-Number>',
    '    <Event-Sequence>11027</Event-Sequence>',
    '    <Event-Subclass>SMS::SEND_MESSAGE</Event-Subclass>',
    '    <proto>sip</proto>',
    '    <dest_proto>sip</dest_proto>',
    '    <from>##########</from>',
    '    <from_full>##########</from_full>',
    '    <to>internal/##########@zip-zop-bobity-boop.com</to>',
    '    <subject>None</subject>',
    '    <type>text/plain</type>',
    '    <hint>the hint</hint>',
    '    <replying>true</replying>',
    '    <Content-Length>23</Content-Length>',
    '  </headers>',
    '  <body>Hello from Chad Engler!</body>',
    '</event>'
].join('\n');

vows.describe('esl.Event').addBatch({
    'Should have': {
	topic: function() {
	    return new Event();
	},
	'the correct exports': function(evt) {
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
	}
    },
    'Should properly construct with': {
	'()': function() {
	    var e = new Event();

	    assert.isEmpty(e.getType());
	    assert.isEmpty(e.type);

	    assert.isNull(e.getHeader('Event-Name'));

	    assert.isEmpty(e.getBody());
	},
	'(type)': function() {
	    var e = new Event('CUSTOM');

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);
	    assert.equal('CUSTOM', e.getHeader('Event-Name'));

	    assert.isEmpty(e.getBody());
	},
	'(type, subclass)': function() {
	    var e = new Event('CUSTOM', 'SMS::SEND_MESSAGE');

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);
	    assert.equal('CUSTOM', e.getHeader('Event-Name'));

	    assert.equal('SMS::SEND_MESSAGE', e.subclass);
	    assert.equal('SMS::SEND_MESSAGE', e.getHeader('Event-Subclass'));

	    assert.isEmpty(e.getBody());
	},
	'(headers)': function() {
	    var e = new Event({ 'Event-Name': 'CUSTOM', 'Reply-Text': '+OK' });

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);

	    assert.equal('CUSTOM', e.getHeader('Event-Name'));
	    assert.equal('+OK', e.getHeader('Reply-Text'));

	    assert.isEmpty(e.getBody());
	},
	'(headers [with Event-Subclass])': function() {
	    var e = new Event({ 'Event-Name': 'CUSTOM', 'Reply-Text': '+OK', 'Event-Subclass': 'SMS::SEND_MESSAGE' });

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);
	    assert.equal('SMS::SEND_MESSAGE', e.subclass);

	    assert.equal('SMS::SEND_MESSAGE', e.getHeader('Event-Subclass'));
	    assert.equal('CUSTOM', e.getHeader('Event-Name'));
	    assert.equal('+OK', e.getHeader('Reply-Text'));

	    assert.isEmpty(e.getBody());
	},
	'(headers [with _body])': function() {
	    var e = new Event({ 'Event-Name': 'CUSTOM', 'Reply-Text': '+OK', '_body': 'some body here' });

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);

	    assert.equal('CUSTOM', e.getHeader('Event-Name'));
	    assert.equal('+OK', e.getHeader('Reply-Text'));

	    assert.equal('some body here', e.getBody());
	},
	'(headers, body)': function() {
	    var e = new Event({ 'Event-Name': 'CUSTOM', 'Reply-Text': '+OK' }, 'some body here');

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);

	    assert.equal('CUSTOM', e.getHeader('Event-Name'));
	    assert.equal('+OK', e.getHeader('Reply-Text'));

	    assert.equal('some body here', e.getBody());
	},
	'(headers [with _body], body)': function() {
	    var e = new Event({ 'Event-Name': 'CUSTOM', 'Reply-Text': '+OK', '_body': 'skip me' }, 'some body here');

	    assert.equal('CUSTOM', e.getType());
	    assert.equal('CUSTOM', e.type);

	    assert.equal('CUSTOM', e.getHeader('Event-Name'));
	    assert.equal('+OK', e.getHeader('Reply-Text'));
	    assert.isNull(e.getHeader('_body'));

	    assert.equal('some body here', e.getBody());
	}
    },
    '.serialize() should': {
	'serialize into': {
	    topic: function() {
		return new Event(data);
	    },
	    'json': function(e) {
		assert.equal(JSON.stringify(data, null, 2), e.serialize('json'));
	    },
	    'plain': function(e) {
		assert.equal(dataPlain, e.serialize());
		assert.equal(e.serialize('plain'), e.serialize());
	    },
	    'xml': function(e) {
		assert.equal(dataXml, e.serialize('xml'));
	    }
	}
    },
    '.setPriority() should': {
	'set priority header': function() {
	    var e = new Event(data);

	    e.setPriority(Event.PRIORITY.HIGH);

	    assert.equal(Event.PRIORITY.HIGH, e.getHeader('priority'));
	}
    },
    '.getHeader() should': {
	'return correct values': function() {
	    var e = new Event(data);

	    assert.equal(data['Event-Name'], e.getHeader('Event-Name'));
	    assert.equal(data['Core-UUID'], e.getHeader('Core-UUID'));
	    assert.equal(data['Event-Date-Timestamp'], e.getHeader('Event-Date-Timestamp'));
	}
    },
    '.getBody() should': {
	'return current body': function() {
	    var e = new Event(data);
	
	    assert.equal(data._body, e.getBody());
	}
    },
    '.getType() should': {
	'return message name': function() {
	    var e = new Event(data);

	    assert.equal(data['Event-Name'], e.getType());
	}
    },
    '.addBody() should': {
	'append body': function() {
	    var e = new Event(data);

	    e.addBody('MOAR BODY');

	    assert.equal(data._body + 'MOAR BODY', e.getBody());
	}
    },
    '.addHeader() should': {
	topic: function() {
	    return new Event(data);
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
	    var e = new Event(data);

	    assert.equal('None', e.getHeader('subject'));

	    e.delHeader('subject');

	    assert.isNull(e.getHeader('subject'));
	    assert.doesNotThrow(e.delHeader.bind(e, 'subject'), Error);
	}
    },
    '.firstHeader() should': {
	'move ptr to first header and return its key': function() {
	    var e = new Event(data), key;

	    assert.isNull(e.hPtr);

	    key = e.firstHeader();

	    assert.strictEqual(0, e.hPtr);
	    assert.equal(e.headers[0].name, key);
	}
    },
    '.nextHeader() should': {
	'move ptr to next header and return its key': function() {
	    var e = new Event(data), key;
	
	    //must call firstHeader before using nextHeader
	    e.firstHeader();

	    assert.strictEqual(0, e.hPtr);

	    key = e.nextHeader();

	    assert.strictEqual(1, e.hPtr);
	    assert.equal(e.headers[1].name, key);
	}
    }
}).export(module);