var events = require('events'),
utile = require('utile'),
net = require('net'),
esl = require('../esl');

//- function(host, port, password)
//Initializes a new instance of ESLconnection, and connects to the
// host $host on the port $port, and supplies $password to freeswitch.
//
//Intended only for an event socket in "Inbound" mode. In other words,
// this is only intended for the purpose of creating a connection to
// FreeSWITCH that is not initially bound to any particular call or channel.
//
//Does not initialize channel information (since inbound connections are
// not bound to a particular channel). In plain language, this means that
// calls to getInfo() will always return NULL.
//
//- function(fd)
//Initializes a new instance of ESLconnection, using the existing file
// number contained in $fd.
//
//Intended only for Event Socket Outbound connections. It will fail on
// Inbound connections, even if passed a valid inbound socket.
//
//The standard method for using this function is to listen for an incoming
// connection on a socket, accept the incoming connection from FreeSWITCH,
// fork a new copy of your process if you want to listen for more connections,
// and then pass the file number of the socket to new($fd).
//
//NOTE: The Connection class only supports 1 connection from FSW, the second
//  ctor option will take in a net.Socket instance (gained from net.connect or
//  on a server's connection event). For multiple connections use esl.Server
var Connection = exports.Connection = function() {
    events.EventEmitter.call(this);

    var len = arguments.length;

    //check if they passed a ready callback
    this.readyCb = (typeof arguments[len - 1] === 'function') ? arguments[len - 1] : null;

    //reasonable defaults for values
    this.execAsync = false;
    this.execLock = false;
    this.connecting = true;
    this.authed = false;
    this.channelData = null;

    //"Inbound" connection (going into FSW)
    if(len === 3 || len === 4) { //3 (host, port, password); 4 (host, port, password, callback)
        //set inbound to true
        this._inbound = true;

	//save password
	this.password = arguments[2];

        //connect to ESL Socket
        this.socket = net.connect({
            port: arguments[1],
            host: arguments[0]
        }, utile.proxy(this._onConnect, this));
    }
    //"Outbound" connection (coming from FSW)
    else if(len >= 1) { //1 (net.Socket); 2 (net.Socket, callback)
	//set inbound to false
        this._inbound = false;

	this.socket = arguments[0];
	this.connecting = false;
	this._onConnect();

	var self = this;
	self.once('esl::channel::data', function(evt) {
	    self.emit('ready');

	    if(self.readyCb && typeof self.readyCb === 'function')
		self.readyCb();
	});

	/*
	var fd = arguments[0];

	//raw fd
	if(typeof fd === 'number') fd = { fd: fd };

	this.server = net.createServer(utile.proxy(this._onServerConnection, this));

	//{ port, host, backlog } object
	if(!!fd.port) {
	    this.server.listen(fd.port, fd.host || null, fd.backlog || null, utile.proxy(this._onListening, this));
	}
	//connect to string *nix socket, another server/socket, or raw fd
	else {
	    this.server.listen(fd, utile.proxy(this._onListening, this));
	}
	*/
    }
    //Invalid arguments passed
    else { //0 args, or more than 4
        self.emit('error', new Error('Bad arguments passed to esl.Connection'));
    }
};

utile.inherits(Connection, events.EventEmitter);

/*********************
 ** Lower-level ESL Specification
 ** http://wiki.freeswitch.org/wiki/Event_Socket_Library
 **********************/

//Returns the UNIX file descriptor for the connection object,
// if the connection object is connected. This is the same file
// descriptor that was passed to new($fd) when used in outbound mode.
Connection.prototype.socketDescriptor = function() {
    if(this._inbound) return null;

    return this.socket;
};

//Test if the connection object is connected. Returns `true` if connected, `false` otherwise.
Connection.prototype.connected = function() {
    return (!this.connecting && !!this.socket);
};

//When FS connects to an "Event Socket Outbound" handler, it sends
// a "CHANNEL_DATA" event as the first event after the initial connection.
// getInfo() returns an ESLevent that contains this Channel Data.
//
//getInfo() returns NULL when used on an "Event Socket Inbound" connection.
Connection.prototype.getInfo = function() {
    return this.channelData; //remains null on Inbound socket
};

//Sends a command to FreeSWITCH.
//
//Does not wait for a reply. You should immediately call recvEvent
// or recvEventTimed in a loop until you get the reply. The reply
// event will have a header named "content-type" that has a value
// of "api/response" or "command/reply".
//
//To automatically wait for the reply event, use sendRecv() instead of send().
//
//NOTE: This is a FAF method of sending a command
Connection.prototype.send = function(command, args) {
    //write raw command to socket
    try {
	this.socket.write(command + '\n');
	if(args) {
	    utile.each(args, function(val, key) {
		this.socket.write(key + ': ' + val + '\n');
	    });
	}
	this.socket.write('\n');
    }
    catch(e) {
	this.emit('error', e);
    }
};

//Internally sendRecv($command) calls send($command) then recvEvent(),
// and returns an instance of ESLevent.
//
//recvEvent() is called in a loop until it receives an event with a header
// named "content-type" that has a value of "api/response" or "command/reply",
// and then returns it as an instance of ESLevent.
//
//Any events that are received by recvEvent() prior to the reply event are queued
// up, and will get returned on subsequent calls to recvEvent() in your program.
//
//NOTE: This listens for a response when calling `.send()` doing recvEvent() in a loop
//  doesn't make sense in the contet of Node.
Connection.prototype.sendRecv = function(command, args, body, cb) {
    if(typeof args === 'function') {
	cb = args;
	args = null;
	body = null;
    }

    if(typeof body === 'function') {
	cb = body;
	body = null;
    }

    if(typeof args === 'string') {
	body = args;
	args = null;
    }

    //wait for command reply
    this.once('esl::command::reply', function(evt) {
	if(cb) cb(evt);
    });

    this.send(command, args, body);
};

//Send an API command (http://wiki.freeswitch.org/wiki/Mod_commands#Core_Commands)
// to the FreeSWITCH server. This method blocks further execution until
// the command has been executed.
//
//api($command, $args) is identical to sendRecv("api $command $args").
Connection.prototype.api = function(command, args, cb) {
    if(typeof args === 'function') {
	cb = args;
	args = '';
    }

    if(args instanceof Array)
	args = args.join(' ');

    args = ' ' + args;

    this.sendRecv('api ' + command + args, cb);
};

//Send a background API command to the FreeSWITCH server to be executed in
// it's own thread. This will be executed in it's own thread, and is non-blocking.
//
//bgapi($command, $args) is identical to sendRecv("bgapi $command $args")
//
//NOTE: Custom jobid is not currently implemented
Connection.prototype.bgapi = function(command, args, jobid, cb) {
    if(typeof args === 'function') {
	cb = args;
	args = '';
	jobid = null;
    }

    if(typeof jobid === 'function') {
	cb = jobid;
	jobid = null;
    }

    if(typeof args === 'string') {
	jobid = args;
	args = '';
    }

    if(args instanceof Array)
	args = args.join(' ');

    args = ' ' + args;

    this.sendRecv('bgapi ' + command + args);
};

//NOTE: This is a wrapper around sendRecv, that uses an ESLevent for the data
Connection.prototype.sendEvent = function(name, event, cb) {
    this.sendRecv('sendevent ' + name + '\n' + event.serialize(), cb);
};

//Returns the next event from FreeSWITCH. If no events are waiting, this
// call will block until an event arrives.
//
//If any events were queued during a call to sendRecv(), then the first
// one will be returned, and removed from the queue. Otherwise, then next
// event will be read from the connection.
//
//NOTE: This is the same as `connection.once('esl::event', ...)` and in fact
//  that is all it does. It does not block as the description says, nor does
//  it queue events. Node has a better Event system than this, use it.
Connection.prototype.recvEvent = function(cb) {
    this.once('esl::event', cb);
};

//Similar to recvEvent(), except that it will block for at most $milliseconds.
//
//A call to recvEventTimed(0) will return immediately. This is useful for polling for events.
//
//NOTE: This does the same as recvEvent, except will timeout if an event isn't received in
//  the specified timeframe
Connection.prototype.recvEventTimed = function(ms, cb) {
    var self = this, timeout, fn;

    fn = function(event, to) {
	clearTimeout(to);
	if(cb) cb(event);
    };

    timeout = setTimeout(function() {
	self.removeListener('esl::event', fn);
	if(cb) cb();
    }, ms);

    //proxy to ensure we pass this timeout to the callback
    self.once('esl::event', utile.proxy(fn, self, timeout));
};

//See the event socket filter command (http://wiki.freeswitch.org/wiki/Event_Socket#filter).
Connection.prototype.filter = function(header, value, cb) {
    this.sendRecv('filter ' + header + ' ' + value, cb);
};

//$event_type can have the value "plain" or "xml" or "json". Any other value specified
// for $event_type gets replaced with "plain".
//
//See the event socket event command for more info (http://wiki.freeswitch.org/wiki/Event_Socket#event).
Connection.prototype.events = function(type, events, cb) {
    if(['plain','xml','json'].indexOf(type) == -1)
	type = 'plain';

    events = events || 'ALL';

    if(events instanceof Array)
	events = events.join(' ');

    this.sendRecv('event ' + type + ' ' + events, cb);
};

//Execute a dialplan application (http://wiki.freeswitch.org/wiki/Mod_dptools#Applications),
// and wait for a response from the server.
// On socket connections not anchored to a channel (most of the time inbound),
// all three arguments are required -- $uuid specifies the channel to execute
// the application on.
//
//Returns an ESLevent object containing the response from the server. The
// getHeader("Reply-Text") method of this ESLevent object returns the server's
// response. The server's response will contain "+OK [Success Message]" on success
// or "-ERR [Error Message]" on failure.
//
//NOTE: This is not implemented yet because WWWUUUUUTTT???!!!
Connection.prototype.execute = function(app, arg, uuid) {
};

//Same as execute, but doesn't wait for a response from the server.
//
//This works by causing the underlying call to execute() to append
// "async: true" header in the message sent to the channel.
//
//NOTE: See .execute() note
Connection.prototype.executeAsync = function(app, arg, uuid) {
};

//Force async mode on for a socket connection. This command has
// no effect on outbound socket connections that are set to "async"
// in the dialplan and inbound socket connections, since these
// connections are already set to async mode on.
//
//$value should be `true` to force async mode, and `false` to not force it.
//
//Specifically, calling setAsyncExecute(true) operates by causing future calls
// to execute() to include the "async: true" header in the message sent to
// the channel. Other event socket library routines are not affected by this call.
//
//NOTE: All these bitches be async, da fuq
Connection.prototype.setAsyncExecute = function(value) {
    this.execAsync = value;
};

//Force sync mode on for a socket connection. This command has no effect on
// outbound socket connections that are not set to "async" in the dialplan,
// since these connections are already set to sync mode.
//
//$value should be `true` to force sync mode, and `false` to not force it.
//
//Specifically, calling setEventLock(1) operates by causing future calls to
// execute() to include the "event-lock: true" header in the message sent
// to the channel. Other event socket library routines are not affected by this call.
//
//See Also:
// Q: Ordering and async keyword (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Ordering_and_async_keyword)
// Q: Can I bridge a call with an Outbound Socket? (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Can_I_bridge_a_call_with_an_Outbound_socket_.3F)
Connection.prototype.setEventLock = function(value) {
    this.execLock = value;
};

//Close the socket connection to the FreeSWITCH server.
Connection.prototype.disconnect = function() {
    this.send('exit');
    this.socket.end();

    this.socket = null;
};

/*********************
 ** Higher-level Library-Specific Functions
 **********************/
Connection.prototype.auth = function(cb) {
    var self = this;

    //send auth command
    self.sendRecv('auth ' + self.password, function(evt) {
	//NEED TO SEE A MSG TO DETERMINE WHAT PASS/FAIL LOOKS LIKE
	console.log(evt);
	self.authed = true;
	self.emit('esl::auth::success');
	self.emit('ready');

	if(self.readyCb && typeof self.readyCb === 'function')
	    self.readyCb();

	if(cb) cb();
    });
};

/*********************
 ** Private helpers
 **********************/
//called when the server is listening
//Connection.prototype._onListening = function() {
//};

//called on connection from freeswitch (on "Outbound" socket)
//Connection.prototype._onServerConnection = function(socket) {
//    if(!this.connecting) return;
//
//    this.connecting = false;
//    this.socket = socket;
//
//    this._onConnect();
//};

//called when socket connects to FSW ESL Server
//or when we successfully listen to the fd
Connection.prototype._onConnect = function() {
    //initialize parser
    this.parser = new esl.Parser(this.socket);

    //on generic event
    this.parser.on('esl::event', utile.proxy(this._onEvent, this));

    //emit that we conencted
    this.emit('esl::connect');
    this.connecting = false;

    //wait for auth request
    this.on('esl::auth::request', utile.proxy(this.auth, this));
};

//When we get a generic ESLevent from FSW
Connection.prototype._onEvent = function(event, headers, body) {
    switch(headers['Content-Type']) {
    case 'auth/request':
        emit = 'esl::auth::request';
        break;

    case 'command/reply':
        emit = 'esl::command::reply';

        //a bug in the response to connect
        if(headers['Event-Name'] === 'CHANNEL_DATA') {
            body = headers;
            headers = {};

            ['Content-Type','Reply-Text','Socket-Mode','Control'].forEach(function(name, i) {
                headers[name] = body[name];
                delete body[name];
            });

	    //TODO: body needs to be str here, but is object
	    //  log its contents to see how to handle it
	    console.log(headers, body);
	    event = new esl.Event(headers, body);

	    if(!this._inbound) {
		this.channelData = event;
		this.emit('esl::channel::data', event);
	    }
        }
        break;

    case 'log/data':
        emit = 'esl::log::data';
        break;

    case 'text/diconnect-notice':
        emit = 'esl::disconnect::notice';
        break;

    case 'api/response':
        emit = 'esl::api::response';
        break;

        //parse body as JSON data
    case 'text/event-json':
        try {
            extra = JSON.parse(body);
            event = new esl.Event(extra);
        } catch(e) {
            //TODO: Error handling
            return;
        }

        emit = 'esl::event::' + headers['Event-Name'];
        break;

        //parse body as header data
    case 'text/event-plain':
        extra = this._parseHeaderText(body)
        event = new esl.Event(extra);
        emit = 'esl::event::' + extra['Event-Name'];
        break;

    default:
        emit = 'esl::raw::' + headers['Content-Type'];
    }

    this.emit('esl::event', event, extra);
    this.emit(emit, event, extra);
};