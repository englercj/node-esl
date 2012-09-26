var esl = require('../esl'),
utile = require('utile');

//liberal inspiration from: http://shimaore.github.com/esl/esl.html

var Parser = exports.Parser = function(socket) {
    this.socket = socket;

    this.socket.setEncoding('ascii');

    this.buffer = '';
    this.bodyLen = 0;

    this.event = null;

    this.on = socket.on;

    socket.on('data', utile.proxy(this._onData, this));
    socket.on('end', utile.proxy(this._onEnd, this));
};

Parser.prototype._onData = function(data) {
    if(this.bodyLen > 0)
	return this._parseBody(data);
    else
	return this._parseHeaders(data);
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
	this.bodyLen = headers['Content-Length'];
	//incase during this time we accumulated data, but didn't know it was body
	this._parseBody('');
    }
    else {
	this._parseEvent(headers);
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

Parser.prototype._parseEvent(headers, body) {
    var event = new esl.Event(headers, body),
    emit, extra;

    this.socket.emit('esl::event', event, headers, body);
};