var esl = require('../esl'),
utile = require('utile'),
events = require('events'),
xml2js = require('xml2js');

//liberal inspiration from: http://shimaore.github.com/esl/esl.html

var Parser = exports.Parser = function(socket) {
    events.EventEmitter.call(this);

    this.socket = socket;

    this.socket.setEncoding('ascii');

    this.buffer = '';
    this.bodyLen = 0;

    this.event = null;

    socket.on('data', this._onData.bind(this));
    socket.on('end', this._onEnd.bind(this));
};

utile.inherits(Parser, events.EventEmitter);

Parser.prototype._onData = function(data) {
    //if we have found a Content-Length header, parse as body
    if(this.bodyLen > 0)
	return this._parseBody(data);
    //otherwise this is more headers
    else
	return this._parseHeaders(data);
};

Parser.prototype._onEnd = function() {
};

Parser.prototype._parseHeaders = function(data) {
    //buffer this header data
    this.buffer += data;

    //get end of header marker
    var headEnd = this.buffer.indexOf('\n\n'),
    headText;

    //if the headers haven't ended yet, keep buffering
    if(headEnd < 0)
	return;

    //if the headers have ended pull out the header text
    headText = this.buffer.substring(0, headEnd);

    //remove header text from buffer
    this.buffer = this.buffer.substring(headEnd + 2);

    //parse text into object
    this.headers = this._parseHeaderText(headText);

    if(this.headers['Content-Length']) {
	//set bodyLen so next data event with process as body
	this.bodyLen = this.headers['Content-Length'];

	//continue processing the buffer as body
	this._parseBody('');
    }
    else {
	//an event is complete, emit it
	this._parseEvent(this.headers);

	//continue parsing the buffer
	this._parseHeaders('');
    }
};

Parser.prototype._parseBody = function(data) {
    //buffer this body data
    this.buffer += data;

    //haven't buffered the entire body yet
    if(this.buffer.length < this.bodyLen)
	return;

    //pull out body text
    var body = this.buffer.substring(0, this.bodyLen);
    this.buffer = this.buffer.substring(this.bodyLen);

    this.bodyLen = 0;

    //create the event
    this._parseEvent(this.headers, body);

    //continue procesing the buffer
    this._parseHeaders('');
};

Parser.prototype._parseHeaderText = function(txt) {
    var lines = txt.split('\n'),
    headers = {};

    lines.forEach(function(line, i) {
	var data = line.split(/: /, 2);
	headers[data[0]] = decodeURIComponent(data[1]);

	if(data[0] == 'Content-Length')
	    headers[data[0]] = parseInt(headers[data[0]], 10);
    });

    return headers;
};

Parser.prototype._parseXmlBody = function(txt, cb) {
    //in the form:
    //<event>
    //  <headers>...</headers>
    //  <Content-Length>4</Content-Length> [optional]
    //  <body>...</body> [optional]
    //</event>
    var parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false }),
    self = this, headers = {};

    //parsing the xml is synchronous, despite the callback
    parser.parseString(txt, function(err, data) {
	if(err) {
	    self.emit('error', err);
	}
	//do a little bit of massaging to get it into the same format
	//as what a JSON message looks like
	headers = data.headers;
	
	if(data.headers['Content-Length']) {
	    headers['Content-Length'] = parseInt(data.headers['Content-Length'], 10);
	    headers._body = data.body;
	}
    });

    return headers;
};

Parser.prototype._parsePlainBody = function(txt) {
    //if the body is event-plain then it is just a bunch of key/value pairs
    var headerEnd = txt.indexOf('\n\n'),
    headers = this._parseHeaderText(txt.substring(0, headerEnd));

    if(headers['Content-Length']) {
	var len = parseInt(headers['Content-Length'], 10);

	//do count with substr instead of index with substring this time
	headers._body = txt.substr(headerEnd + 2, len);
    }

    return headers;
};

Parser.prototype._parseEvent = function(headers, body) {
    var event, data;

    switch(headers['Content-Type']) {
        //parse body as JSON event data
    case 'text/event-json':
        try {
	    data = JSON.parse(body);
	    if(data['Content-Length'])
		data['Content-Length'] = parseInt(data['Content-Length'], 10);
	}
	catch(e) { this.emit('error', e); }
        break;

        //parse body as PLAIN event data
    case 'text/event-plain':
        data = this._parsePlainBody(body);
        break;

	//parse body as XML event data
    case 'text/event-xml':
	data = this._parseXmlBody(body);
	break;
    }

    if(data)
	event = new esl.Event(data);
    else
	event = new esl.Event(headers, body);

    //try and massage an OK/Error message
    var reply = event.getHeader('Reply-Text');
    if(reply) {
	if(reply.indexOf('-ERR') === 0) {
	    event.addHeader('Modesl-Reply-ERR', reply.substring(5));
	} else if(reply.indexOf('+OK') === 0) {
	    event.addHeader('Modesl-Reply-OK', reply.substring(4));
	}
    }

    this.emit('esl::event', event, headers, body);
};