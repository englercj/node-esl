var utile = require('utile');

//can be (type {string}[, subclass {string}])
//or (headers {object/map}[, body {string}])
var Event = exports.Event = function(type, subclass) {
    if(typeof type === 'string') {
	this.type = type;
	this.subclass = subclass;
	this.body = '';
	
	this.headers = [];

	this.addHeader('Event-Name', type);
	if(subclass) this.addHeader('Event-Subclass', subclass);
    } else {
	this.type = type['Event-Name'];
	this.subclass = type['Event-Subclass'];
	this.body = subclass || '';

	this.headers = [];

	utile.each(type, function(val, key) {
	    this.addHeader(key, val);i
	});
    }

    this.hPtr = null;
    //var ni = os.networkInterfaces(),
    //now = new Date(),
    //local = now.getFullYear() + '-' + (now.getMonth + 1) + '-' + now.getDate() + ' '
	//+ now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();

    //Set by freeswitch
    //this.setHeader('Core-UUID', /* ??? */); //8b192020-7368-4498-9b11-cbe10f48a784
    //this.setHeader('FreeSWITCH-Hostname', os.hostname());
    //this.setHeader('FreeSWITCH-Switchname', /* ??? */os.hostname()); //smsdev
    //this.setHeader('FreeSWITCH-IPv4', /* ??? */ ni.eth0[0].address); //10.1.12.115
    //this.setHeader('FreeSWITCH-IPv6', /* ??? */ ni.eth0[ni.eth0.length - 1].address); //::1
    //this.setHeader('Event-Date-Local', local);
    //this.setHeader('Event-Date-GMT', now.toGMTString());
    //this.setHeader('Event-Date-Timestamp', microtime.now());
    //this.setHeader('Event-Calling-File', /* ??? */); //switch_cpp.cpp
    //this.setHeader('Event-CallingFunction', /* ??? */); //Event
    //this.setHeader('Event-Calling-Line-Number', /* ??? */); //262
    //this.setHeader('Event-Sequence', /* ??? */); //11149    
};

Event.PRIORITY = {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH'
};

//Turns an event into colon-separated 'name: value' 
// pairs similar to a sip/email packet 
// (the way it looks on '/events plain all').
Event.prototype.serialize = function(format) {
    format = format || 'plain';

    switch(format) {
    case 'json':
	/*
	{
            "Event-Name":   "CUSTOM",
            "Core-UUID":    "8b192020-7368-4498-9b11-cbe10f48a784",
            "FreeSWITCH-Hostname":  "smsdev",
            "FreeSWITCH-Switchname":        "smsdev",
            "FreeSWITCH-IPv4":      "10.1.12.115",
            "FreeSWITCH-IPv6":      "::1",
            "Event-Date-Local":     "2012-09-25 14:22:37",
            "Event-Date-GMT":       "Tue, 25 Sep 2012 18:22:37 GMT",
            "Event-Date-Timestamp": "1348597357036551",
            "Event-Calling-File":   "switch_cpp.cpp",
            "Event-Calling-Function":       "Event",
            "Event-Calling-Line-Number":    "262",
            "Event-Sequence":       "11027",
            "Event-Subclass":       "SMS::SEND_MESSAGE",
            "proto":        "sip",
            "dest_proto":   "sip",
            "from": "9515529832",
            "from_full":    "9515529832",
            "to":   "internal/8507585138@sms-proxy-01.bandwidthclec.com",
            "subject":      "PATLive Testing",
            "type": "text/plain",
            "hint": "the hint",
            "replying":     "true",
            "Content-Length":       "23",
            "_body":        "Hello from Chad Engler!"
	}
	*/
	var data = {};
	this.headers.forEach(function(header, i) {
	    data[header.name] = header.value;
	});

	if(this.body) {
	    data['Content-Length'] = this.body.length;
	    data['_body'] = this.body;
	);

	return JSON.stringify(data);

    case 'plain':
	/*
	  Event-Name: CUSTOM
	  Core-UUID: 8b192020-7368-4498-9b11-cbe10f48a784
	  FreeSWITCH-Hostname: smsdev
	  FreeSWITCH-Switchname: smsdev
	  FreeSWITCH-IPv4: 10.1.12.115
	  FreeSWITCH-IPv6: %3A%3A1
	  Event-Date-Local: 2012-09-25%2014%3A21%3A56
	  Event-Date-GMT: Tue,%2025%20Sep%202012%2018%3A21%3A56%20GMT
	  Event-Date-Timestamp: 1348597316736546
	  Event-Calling-File: switch_cpp.cpp
	  Event-Calling-Function: Event
	  Event-Calling-Line-Number: 262
	  Event-Sequence: 11021
	  Event-Subclass: SMS%3A%3ASEND_MESSAGE
	  proto: sip
	  dest_proto: sip
	  from: 9515529832
	  from_full: 9515529832
	  to: internal/8507585138%40sms-proxy-01.bandwidthclec.com
	  subject: PATLive%20Testing
	  type: text/plain
	  hint: the%20hint
	  replying: true
	  Content-Length: 23
	 */
	var data = '';

	this.headers.forEach(function(header, i) {
	    data += header.name + ': ' + encodeURIComponent(header.value) + '\n';
	});

	if(this.body) {
	    data += 'Content-Length: ' + this.body.length + '\n\n';
	    data += encodeURIComponent(this.body);
	}

	data += '\n';
	
	return data;

	/*
	  <event>
	    <headers>
	      <Event-Name>CUSTOM</Event-Name>
	      <Core-UUID>8b192020-7368-4498-9b11-cbe10f48a784</Core-UUID>
	      <FreeSWITCH-Hostname>smsdev</FreeSWITCH-Hostname>
	      <FreeSWITCH-Switchname>smsdev</FreeSWITCH-Switchname>
	      <FreeSWITCH-IPv4>10.1.12.115</FreeSWITCH-IPv4>
	      <FreeSWITCH-IPv6>%3A%3A1</FreeSWITCH-IPv6>
	      <Event-Date-Local>2012-09-25%2014%3A26%3A17</Event-Date-Local>
	      <Event-Date-GMT>Tue,%2025%20Sep%202012%2018%3A26%3A17%20GMT</Event-Date-GMT>
	      <Event-Date-Timestamp>1348597577616542</Event-Date-Timestamp>
	      <Event-Calling-File>switch_cpp.cpp</Event-Calling-File>
	      <Event-Calling-Function>Event</Event-Calling-Function>
	      <Event-Calling-Line-Number>262</Event-Calling-Line-Number>
	      <Event-Sequence>11057</Event-Sequence>
	      <Event-Subclass>SMS%3A%3ASEND_MESSAGE</Event-Subclass>
	      <proto>sip</proto>
	      <dest_proto>sip</dest_proto>
	      <from>9515529832</from>
	      <from_full>9515529832</from_full>
	      <to>internal/8507585138%40sms-proxy-01.bandwidthclec.com</to>
	      <subject>PATLive%20Testing</subject>
	      <type>text/plain</type>
	      <hint>the%20hint</hint>
	      <replying>true</replying>
	    </headers>
	    <Content-Length>23</Content-Length>
	    <body>Hello from Chad Engler!</body>
	  </event>
	 */
    case 'xml':
	var data = '<event>\n';

	//add headers
	data += '  <headers>\n';
	this.headers.forEach(function(header, i) {
	    data += '    <' + header.name + '>' + encodeURIComponent(header.value) + '</' + header.name + '>\n';
	});
	data += '  </headers>\n';

	//add body
	if(this.body) {
	    data += '  <Content-Length>' + this.body.length + '</Content-Length>\n';
	    data += '  <body>' + encodeURIComponent(this.body) + '</body>\n';
	}

	data += '</event>\n';

	return data;
    }
};

//Sets the priority of an event to $number in case it's fired.
//'NORMAL', 'LOW', 'HIGH', 'INVALID'
Event.prototype.setPriority = function(priority) {
    this.addHeader('priority', priority);
};

//Gets the header with the key of $header_name from an event object. 
Event.prototype.getHeader = function(name) {
    return this._findHeader(name).value;
};

//Gets the body of an event object. 
Event.prototype.getBody = function() {
    return this.body;
};

//Gets the event type of an event object. 
Event.prototype.getType = function() {
    return this.type;
};

//Add $value to the body of an event object. 
// This can be called multiple times for the same event object. 
Event.prototype.addBody = function(value) {
    return this.body += value;
};

//Add a header with key = $header_name and value = $value
// to an event object. This can be called multiple times
// for the same event object. 
Event.prototype.addHeader = function(name, value) {
    var h = this._findHeader(name);
    
    if(h) h.value = value;
    else this.headers.push({ name: name, value: value });

    return value;
};

//Delete the header with key $header_name from an event object. 
Event.prototype.delHeader = function(name) {
    var i = this._findHeaderIndex(name);

    return this.headers.splice(i, 1);
};

//Sets the pointer to the first header in an event object,
// and returns it's key name. This must be called before nextHeader is called. 
Event.prototype.firstHeader = function() {
    this.hPtr = 0;

    return this.headers[0].name;
};

//Moves the pointer to the next header in an event object,
// and returns it's key name. firstHeader must be called
// before this method to set the pointer. If you're already
// on the last header when this method is called, then it will return NULL. 
Event.prototype.nextHeader = function() {
    //if no firstHeader called yet
    if(this.hPtr === null)
	return null;

    //if reached end
    if(this.hPtr === (this.headers.length - 1))
	return this.hPtr = null;

    //increment and return
    return this.headers[++this.hPtr].name;
};

Event.prototype._findHeaderIndex = function(name) {
    for(var i = 0, len = this.headers.length; i < len; ++i) {
	if(this.headers[i].name == name)
	    return i;
    }

    return null;
};

Event.prototype._findHeader = function(name) {
    var i = this._findHeaderIndex(name);

    return i ? this.headers[i] : i;
};