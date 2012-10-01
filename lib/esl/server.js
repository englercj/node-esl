var EventEmitter2 = require('eventemitter2').EventEmitter2,
utile = require('utile'),
net = require('net'),
crypto = require('crypto'),
esl = require('../esl');

var Server = exports.Server = function(opts, readyCb) {
    if(typeof opts === 'function') {
	readyCb = opts;
	opts = null;
    }

    this.readyCb = readyCb;
    this.connections = {};
    this.seq = Date.now() | 0;

    opts = opts || null;

    if(opts.server) {
	this.port = opts.server.address().port;
	this.host = opts.server.address().host;

	this.server = opts.server;

	this.emit('ready');
	if(readyCb) readyCb();
    }
    else {
	this.port = opts.port || 8022;
	this.host = opts.host || '127.0.0.1';

	this.server = net.createServer(utile.proxy(this._onConnection, this));
	this.server.listen(this.port, this.host, utile.proxy(this._onListening, this));
    }
};

utile.inherits(Server, EventEmitter2);

Server.prototype._onConnection = function(socket) {
    var conn = new esl.Connection(socket),
    id = this._generateId();

    this.connections[id] = {
	conn: conn,
	socket: socket
    };

    conn.on('ready', utile.proxy(function(c, id) {
	this.emit('connection::open', c);
    }, this, conn, id));

    conn.on('esl::end', utile.proxy(function(c, id) {
	this.emit('connection::close', c);
    }, this, conn, id));
};

Server.prototype._onListening = function() {
    this.emit('ready');

    if(this.readyCb) this.readyCb();
};

Server.prototype._generateId = function() {
    var rand = new Buffer(15); // multiple of 3 for base64

    this.seq = (this.seq + 1) | 0;

    rand.writeInt32BE(this.seq, 11);

    if (crypto.randomBytes) {
	crypto.randomBytes(12).copy(rand);
    } else {
	// not secure for node 0.4
	[0, 4, 8].forEach(function(i) {
	    rand.writeInt32BE(Math.random() * Math.pow(2, 32) | 0, i);
	});
    }

    return rand.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
};