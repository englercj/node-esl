var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    xml2js = require('xml2js'),
    Buffer = require('buffer').Buffer,
    Event = require('./Event');

var Parser = module.exports = function(socket) {
    EventEmitter2.call(this, {
        wildcard: true,
        delimiter: '::',
        maxListeners: 25
    });

    this.buffer = new Buffer([]);
    this.bodyLen = 0;
    this.encoding = 'utf8';

    this.socket = socket;

    this.event = null;

    socket.on('data', this._onData.bind(this));
    socket.on('end', this._onEnd.bind(this));
};

util.inherits(Parser, EventEmitter2);

Parser.prototype._onData = function(data) {
    this.buffer = Buffer.concat([this.buffer, data], this.buffer.length + data.length);

    //if we have found a Content-Length header, parse as body
    if(this.bodyLen > 0)
        return this._parseBody();
    //otherwise this is more headers
    else
        return this._parseHeaders();
};

Parser.prototype._onEnd = function() {
};

Parser.prototype._indexOfHeaderEnd = function() {
    for(var i = 0, len = this.buffer.length - 1; i < len; ++i) {
        if(this.buffer[i] === 0x0a && this.buffer[i + 1] === 0x0a) {
            return i;
        }
    }

    return -1;
};

Parser.prototype._parseHeaders = function() {
    //get end of header marker
    var headEnd = this._indexOfHeaderEnd();

    //if the headers haven't ended yet, keep buffering
    if(headEnd === -1) {
        return;
    }

    //if the headers have ended pull out the header text
    var headText = this.buffer.toString(this.encoding, 0, headEnd);

    //remove header text from buffer
    this.buffer = this.buffer.slice(headEnd + 2);

    //parse text into object
    this.headers = this._parseHeaderText(headText);

    //if there is a body to parse, attempt to parse it if we have it in the buffer
    if(this.headers['Content-Length']) {
        //set bodyLen so next data event with process as body
        this.bodyLen = this.headers['Content-Length'];

        //continue processing the buffer as body
        if(this.buffer.length) this._parseBody();
    }
    //otherwise, this even is completed create an esl.Event object from it
    else {
        //an event is complete, emit it
        this._parseEvent(this.headers);

        //continue parsing the buffer
        if(this.buffer.length) this._parseHeaders();
    }
};

Parser.prototype._parseBody = function() {
    //haven't buffered the entire body yet, buffer some more first
    if(this.buffer.length < this.bodyLen)
        return;

    //pull out the body
    var body = this.buffer.slice(0, this.bodyLen).toString(this.encoding);

    this.buffer = this.buffer.slice(this.bodyLen);
    this.bodyLen = 0;

    //create the event object
    this._parseEvent(this.headers, body);

    //continue procesing the buffer after the body of the previous event has been pulled out
    this._parseHeaders();
};

Parser.prototype._parseHeaderText = function(txt) {
    return txt.split('\n').reduce(function(headers, line) {
        var data = line.split(': '),
            key = data.shift(),
            value = decodeURIComponent(data.join(': '));

        if(key === 'Content-Length') {
            headers[key] = parseInt(value, 10);
        } else {
            headers[key] = value;
        }

        return headers;
    }, {});
};

Parser.prototype._parseXmlBody = function(txt) {
    //in the form:
    //<event>
    //  <headers>...</headers>
    //  <Content-Length>4</Content-Length> [optional]
    //  <body>...</body> [optional]
    //</event>
    var parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false }),
        self = this,
        headers = {};

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
        var len = parseInt(headers['Content-Length'], 10),
            start = headerEnd + 2,
            end = start + len;

        //extract body with byte length
        headers._body = (new Buffer(txt)).slice(start, end).toString(this.encoding);
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
        event = new Event(data);
    else
        event = new Event(headers, body);

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
