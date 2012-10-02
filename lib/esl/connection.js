var EventEmitter2 = require('eventemitter2').EventEmitter2,
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
    EventEmitter2.call(this, {
	wildcard: true,
	delimiter: '::',
	maxListeners: 25
    });

    var len = arguments.length, self = this;

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
        }, this._onConnect.bind(this));

	this.socket.on('error', this._onError.bind(this));
    }
    //"Outbound" connection (coming from FSW)
    else if(len >= 1) { //1 (net.Socket); 2 (net.Socket, callback)
	//set inbound to false
        this._inbound = false;

	this.socket = arguments[0];
	this.connecting = false;
	this._onConnect();

	this.send('connect');

	this.once('esl::event::CHANNEL_DATA::*', function(evt) {
	    self.emit('esl::ready');

	    if(self.readyCb && typeof self.readyCb === 'function')
		self.readyCb();
	});

	this.socket.on('error', this._onError.bind(this));
    }
    //Invalid arguments passed
    else { //0 args, or more than 4
        this.emit('error', new Error('Bad arguments passed to esl.Connection'));
    }

    //emit end when stream closes
    this.socket.on('end', function() {
	self.emit('esl::end');
	this.socket = null;
    });
};

utile.inherits(Connection, EventEmitter2);

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
    var self = this;

    //write raw command to socket
    try {
	self.socket.write(command + '\n');
	if(args) {
	    utile.each(args, function(val, key) {
		self.socket.write(key + ': ' + val + '\n');
	    });
	}
	self.socket.write('\n');
    }
    catch(e) {
	self.emit('error', e);
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
Connection.prototype.sendRecv = function(command, args, cb) {
    if(typeof args === 'function') {
	cb = args;
	args = null;
    }

    cb = cb || this._noop;

    //wait for command reply
    this.once('esl::event::command::reply', cb);
    this.send(command, args);
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

    args = (args ? ' ' + args : '');

    cb = cb || this._noop;

    //wait for reply from api command
    this.once('esl::event::api::response', cb);
    this.send('api ' + command + args);
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

    args = args || ''; //incase they pass null/false


    if(args instanceof Array)
	args = args.join(' ');

    args = ' ' + args;

    var self = this, params = {};

    if(jobid) params['Job-UUID'] = jobid;

    self.sendRecv('bgapi ' + command + args, params, function(evt) {
	//got the command reply, use the Job-UUID to call user callback
	self.once('esl::event::BACKGROUND_JOB::' + evt.getHeader('Job-UUID'), cb);
    });
};

//NOTE: This is a wrapper around sendRecv, that uses an ESLevent for the data
Connection.prototype.sendEvent = function(event, cb) {
    this.sendRecv('sendevent ' + event.getHeader('Event-Name') + '\n' + event.serialize(), cb);
};

//Returns the next event from FreeSWITCH. If no events are waiting, this
// call will block until an event arrives.
//
//If any events were queued during a call to sendRecv(), then the first
// one will be returned, and removed from the queue. Otherwise, then next
// event will be read from the connection.
//
//NOTE: This is the same as `connection.once('esl::event::*', ...)` and in fact
//  that is all it does. It does not block as the description says, nor does
//  it queue events. Node has a better Event system than this, use it.
Connection.prototype.recvEvent = function(cb) {
    cb = cb || this._noop;

    this.once('esl::event::*', cb);
};

//Similar to recvEvent(), except that it will block for at most $milliseconds.
//
//A call to recvEventTimed(0) will return immediately. This is useful for polling for events.
//
//NOTE: This does the same as recvEvent, except will timeout if an event isn't received in
//  the specified timeframe
Connection.prototype.recvEventTimed = function(ms, cb) {
    var self = this, timeout, fn;

    fn = function(to, event) {
	clearTimeout(to);
	if(cb) cb(event);
    };

    timeout = setTimeout(function() {
	self.removeListener('esl::event::*', fn);
	if(cb) cb();
    }, ms);

    //proxy to ensure we pass this timeout to the callback
    self.once('esl::event::*', fn.bind(self, timeout));
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

    if(typeof events === 'function') {
	cb = events;
	events = null;
    }

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
Connection.prototype.execute = function(app, arg, uuid, cb) {
    var self = this, opts = {};

    if(typeof arg === 'function') {
	cb = arg;
	args = '';
    }

    if(typeof uuid === 'function') {
	cb = uuid;
	uuid = null;
    }

    //setup options
    opts['execute-app-name'] = app;
    opts['execute-app-arg'] = arg;

    if(self.async) {
	self.once('');
    }

    //if inbound
    if(self._inbound) {
	//if no uuid passed, create one
	if(!uuid) {
	    self.api('create_uuid', function(evt) {
		uuid = evt.getBody();
		self._doExec(uuid, app, opts, cb);
	    });
	}
	//if passed uuid, use it
	else {
	    self._doExec(uuid, app, opts, cb);
	}
    }
    //if outbound
    else {
	//grab our unique-id from channel_data
	uuid = self.getInfo().getHeader('unique-id');
	self._doExec(uuid, app, opts, cb);
    }
};

//Same as execute, but doesn't wait for a response from the server.
//
//This works by causing the underlying call to execute() to append
// "async: true" header in the message sent to the channel.
//
//NOTE: See .execute() note
Connection.prototype.executeAsync = function(app, arg, uuid, cb) {
    //temporarily set async to true
    var old = this.async;
    this.async = true;

    //run execute
    this.execute(app, arg, uuid, cb);

    //reset async
    this.async = old;
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
 ** Some of these simply provide syntatic sugar
 **********************/
Connection.prototype.auth = function(cb) {
    var self = this;

    //send auth command
    self.sendRecv('auth ' + self.password, function(evt) {
	if(evt.getHeader('Reply-Text') == '+OK accepted') {
	    self.authed = true;

	    self.subscribe();

	    self.emit('esl::event::auth::success');
	    self.emit('esl::ready');

	    if(self.readyCb && typeof self.readyCb === 'function')
		self.readyCb();

	    if(cb && typeof cb === 'function') cb();
	} else {
	    self.authed = false;
	    self.emit('esl::event::auth::fail');
	    
	    if(cb && typeof cb === 'function') cb(new Error('Authentication Failed'));
	}
    });
};

//subscribe to events using json format (native support)
Connection.prototype.subscribe = function(events, cb) {
    events = events || 'all';

    this.events('json', events, cb);
};

//make an originating call
Connection.prototype.originate = function(profile, gateway, number, app, sync, cb) {
    if(typeof app === 'function') {
	cb = app;
	app = null;
	sync = false;
    }

    if(typeof sync === 'function') {
	cb = sync;
	sync = null;
    }

    if(typeof app === 'boolean') {
	sync = app;
	app = null;
    }

    var arg = 'sofia/' + profile + '/' + number + '@' + gateway + (app ? ' &' + app : '');

    if(sync) {
	this.api('originate', arg, cb);
    } else {
	this.bgapi('originate', arg, cb);
    }
};

//send a SIP MESSAGE
Connection.prototype.message = function(to, from, profile, body, cb) {
    if(typeof subject === 'function') {
	cb = subject;
	subject = '';
    }

    var event = new esl.Event('custom', 'SMS::SEND_MESSAGE');

    event.addHeader('proto', 'sip');
    event.addHeader('dest_proto', 'sip');

    event.addHeader('from', 'sip:' + from);
    event.addHeader('from_full', 'sip:' + from);

    event.addHeader('to', to);
    event.addHeader('sip_profile', profile);
    event.addHeader('subject', 'SIMPLE MESSAGE');

    event.addHeader('type', 'text/plain');
    event.addHeader('Content-Type', 'text/plain');

    event.addBody(body);

    this.sendEvent(event, cb);
};


/*********************
 ** Private helpers
 **********************/
//noop because EventEmitter2 makes me pass a function
Connection.prototype._noop = function() {};

//helper for execute, sends the actual message
Connection.prototype._doExec = function(uuid, cmd, args, cb) {
    args['call-command'] = cmd;
    
    if(this.execAsync) args['async'] = true;
    if(this.execLock) args['event-lock'] = true;

    cb = cb || this._noop;

    this.once('esl::event::CHANNEL_EXECUTE_COMPLETE::' + uuid, cb);

    this.send('sendmsg ' + uuid, args);
};

//called on socket/generic error, simply echo the error
//to the user
Connection.prototype._onError = function(err) {
    this.emit('error', err);
};

//called when socket connects to FSW ESL Server
//or when we successfully listen to the fd
Connection.prototype._onConnect = function() {
    //initialize parser
    this.parser = new esl.Parser(this.socket);

    //on generic event
    this.parser.on('esl::event', this._onEvent.bind(this));

    //on parser error
    this.parser.on('error', console.log);

    //emit that we conencted
    this.emit('esl::connect');
    this.connecting = false;

    //wait for auth request
    this.on('esl::event::auth::request', this.auth.bind(this));
};

//When we get a generic ESLevent from FSW
Connection.prototype._onEvent = function(event, headers, body) {
    var emit = 'esl::event',
    uuid = event.getHeader('Job-UUID') || event.getHeader('Unique-ID') || event.getHeader('Core-UUID');

    //massage Content-Types into event names,
    //since not all events actually have an Event-Name
    //header; we have to make our own
    switch(headers['Content-Type']) {
    case 'auth/request':
        emit += '::auth::request';
        break;

    case 'command/reply':
        emit += '::command::reply';

        if(headers['Event-Name'] === 'CHANNEL_DATA') {
	    if(!this._inbound) {
		this.channelData = event;
		this.emit('esl::event::CHANNEL_DATA' + (!!uuid ? '::' + uuid : ''), event);
	    }
        }
        break;

    case 'log/data':
        emit += '::logdata';
        break;

    case 'text/diconnect-notice':
        emit += '::disconnect::notice';
        break;

    case 'api/response':
        emit += '::api::response';
        break;


    case 'text/event-json':
    case 'text/event-plain':
    case 'text/event-xml':
        emit += '::' + event.getHeader('Event-Name') + (!!uuid ? '::' + uuid : '');
	break;

    default:
        emit += '::raw::' + headers['Content-Type'];
    }

    this.emit(emit, event, headers, body);
};