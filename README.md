## FreeSWITCH ESL Bindings for Node.js

A Library for handling low-level FreeSWITCH ESLconnections, and associated ESLevents.

### Purpose

Though there is already a Node.js "library" for this [on github](https://github.com/shimaore/esl),
it does not actually implement the [Event Socket Library](http://wiki.freeswitch.org/wiki/Event_Socket_Library)
interface, and instead has it's own thing that really doesn't work all that well. Plus,it is written
in coffee script making it stupid to maintain.

### Installation

The easiest way to install is via npm:

```shell
npm install git+https://github.patlive.local/Chad-Engler/node-esl.git
```

This package is not published to the public registry so far.

### Usage

The most basic usage example is to open a connection, and send a status command:

```javascript
var esl = require('modesl'),
conn = new esl.Connection('127.0.0.1', 8021, 'clueCon', function() {
    conn.api('status', function(res) {
        //res is an esl.Event instance
	console.log(res.getBody());
    });
});
```

### Interface

This library exposes 2 main classes:

 * `esl.Connection`
 * `esl.Event`
 * `esl.Server` [Coming Soon]

Which implement the [ESLconnection](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLconnection_Object)
and [ESLevent](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLevent_Object) interfaces, respectively.
The `esl` object actually exported from this module is considered to implement the 
[ESL Object](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESL_Object) interface.

You can read the documentation about the [Event Socket Library](http://wiki.freeswitch.org/wiki/Event_Socket_Library)
to understand what each function does. However, there are a couple caveats. This interface was meant to be blocking
in many different places, however due to the nature of node nearly _all_ are asynchronous (though some commands
such as `api` will still block on the freeswitch side, they are non-blocking on the node side).

A couple caveats are:

#### `esl.Connection` Constructor

The documentation lists 2 ways this constructor can be called either:

```javascript
var conn = new esl.Connection(host, port, password[, readyCallback]);
```

Which will create a new connection client, an "Inbound" Connection, which connects up to FreeSWITCH and will
allow you to send commands to the server. This is the same as in the documentation (with the addition of a 
ready callback parameter which is called once the connection is opened, and authenticated).

The other however, expects a raw file descriptor and is in the format:

```javascript
var conn = new esl.Connection(fd);
```

The reasoning is because, according to the documentation:

```
The standard method for using this function is to listen for an incomingconnection on a socket, accept
the incoming connection from FreeSWITCH, fork a new copy of your process if you want to listen for more
connections, and then pass the file number of the socket to new($fd).
````

However, node doesn't need to fork to accept multiple connections. But an `esl.Connection` instance should
still be only 1 Channel Connection instance. To solve this issue, the second form will accept an instance of
Node's [`net.Socket`](http://nodejs.org/api/net.html#net_class_net_socket). In this way you can do the server
management yourself (or using `esl.Server` to do it for you).

This changes the constructor call for an "Inbound" connection to look like:

```javascript
var conn = new esl.Connection(socket[, readyCallback]);
```

The readyCallback is called once the connection is stored, and a `CHANNEL_DATA` event is received.

#### `esl.Connection::sendRecv(command[, args][, body][, callback]);`

This function according to the documentation is suppossed to send the command via `esl.Connection::send()`
(which it does), then call `esl.Connection::recvEvent()` in a loop until it received the `command/reply`
ESLevent.

The reason it wants to do this (in addition to some crazy event queue specs) is to emulate an evented system;
but Node is _already evented_. Therefore this function will instead use the built-in node event system to
wait for `esl::command::reply` (the event emitted by this library on `command/reply`) then execute the callback
if one was passed.

#### `esl.Connection::bgapi(command[, args][, jobid][, callback]);`

The `jobid` argument is not currently implemented and will be ignored.

#### `esl.Connection::recvEvent(callback);`

This function is part of the crazy event system FreeSWITCH has to implement in non-evented languages. Node has
a better event system than this, so all this function does is `connection.once('esl::event', cb);`. You could
just do the same yourself, but the function is here to meet the interface.

### Library API Documentation

Since this library implements the [Event Socket Library](http://wiki.freeswitch.org/wiki/Event_Socket_Library)
interface, the API is the same as on that page. The code is also ___heavily___ commented describing each
function in full. However, since some function prototypes changed slightly in translation, and for quick
reference they are listed below:

#### `esl`

 - `esl.setLogLevel(level)`
 - `esl.Connection`
 - `esl.Event`
 - `esl.Server` [Coming Soon]

#### `esl.Connection`

 - `Connection(host {string}, port {number}, password {string}[, readyCallback {function}]);` (ctor)
 - `Connection(socket {net.Socket}[, readyCallback {function}]);` (ctor)
 - `socketDescriptor();`
 - `connected()`
 - `getInfo()`
 - `send(command {string}, args {object})`
 - `sendRecv(command {string}[, args {object}][, body {string}][, callback {function}])`
 - `api(command {string}[, args {array}][, callback {function}])`
 - `bgapi(command {string}[, args {array}][, callback {function}])`
 - `sendEvent(name {string}, event {esl.Event}[, callback {function}])`
 - `recvEvent(callback {function})`
 - `recvEventTimed(ms {number}[, callback {function}])`
 - `filter(header {string}, value {string}[, callback {function}])`
 - `events(type {string:'plain'|'xml'|'json'}, events {string,array}[, callback {function}])`
 - `execute(app {?}, arg {?}, uuid {string})` (NOT IMPLEMENTED)
 - `executeAsync(app {?}, arg {?}, uuid {string})` (NOT IMPLEMENTED)
 - `setAsyncExecute(value {boolean})`
 - `setEventLock(value {boolean})`
 - `disconnect()`
 - `auth([callback {function}])`

#### 'esl.Event`

 - `Event.PRIORITY` (object containing valid priorities)

 - `Event(type {string}[, subclass {string}])` (ctor)
 - `Event(headers {object}[, body {string}])` (ctor)
 - `serialize([format {string:'plain'|'xml'|'json'}])` (defaults to 'plain')
 - `setPriority(priority {esl.Event.PRIORITY})`
 - `getHeader(name {string})`
 - `getBody()`
 - `getType()`
 - `addBody(value {string})` (appends to current body)
 - `addHeader(name {string}, value {string})` (if `name` exists, overwrites value)
 - `delHeader(name {string})`
 - `firstHeader()`
 - `nextHeader()`