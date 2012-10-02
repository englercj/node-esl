var esl = require('../esl'),
utile = require('utile'),
events = require('events');

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
    if(this.bodyLen > 0)
	return this._parseBody(data);
    else
	return this._parseHeaders(data);
};

Parser.prototype._onEnd = function() {
};

Parser.prototype._parseHeaders = function(data) {
    this.buffer += data;

    //get end of header marker
    var headEnd = this.buffer.indexOf('\n\n'),
    headText;

    //if the headers haven't ended yet, keep soaking it up
    if(headEnd < 0)
	return;

    //if the headers have ended pull out the header text
    headText = this.buffer.substring(0, headEnd);

    //remove header text from buffer
    this.buffer = this.buffer.substring(headEnd + 2);

    //parse text into object
    this.headers = this._parseHeaderText(headText);

    if(this.headers['Content-Length']) {
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
    this.buffer += data;

    //haven't got entire buffer yet
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
    });

    return headers;
};

Parser.prototype._parseXmlHeaderText = function(txt) {

};

Parser.prototype._parseEvent = function(headers, body) {
    var event = new esl.Event(headers, body),
    data;

    switch(headers['Content-Type']) {
        //parse body as JSON event data
    case 'text/event-json':
        try { data = JSON.parse(body); }
	catch(e) { this.emit('error', e); }
        break;

        //parse body as PLAIN event data
    case 'text/event-plain':
        data = this._parseHeaderText(body);
        break;

	//parse body as XML event data
    case 'text/event-xml':
	data = this._parseXmlHeaderText(body);
	break;
    }

    if(data)
	event = new esl.Event(data);

    this.emit('esl::event', event, headers, body);
};