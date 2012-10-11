var data = {
    event: {
        json: JSON.stringify({
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
        }, null, 2),
        plain: [
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
        xml: [
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
        ].join('\n'),
	badJson: [
	    '{ herp: derp }'
	].join('\n'),
	badXml: [
	    '<herp|"derp<//>>'
	].join('\n')
    }
};

data.stream = {
    normal: data.event.plain,
    json: [
	'Content-Type: text/event-json',
	'Content-Length: ' + data.event.json.length,
	'',
	data.event.json
    ].join('\n'),
    plain: [
	'Content-Type: text/event-plain',
	'Content-Length: ' + data.event.plain.length,
	'',
	data.event.plain
    ].join('\n'),
    xml: [
	'Content-Type: text/event-xml',
	'Content-Length: ' + data.event.xml.length,
	'',
	data.event.xml
    ].join('\n')
};

module.exports = data;