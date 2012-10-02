## FreeSWITCH ESL Bindings for Node.js

A Library for handling low-level FreeSWITCH ESLconnections, and associated ESLevents.

### Purpose

Though there is already a Node.js "library" for this [on github](https://github.com/shimaore/esl),
it does not actually implement the [Event Socket Library](http://wiki.freeswitch.org/wiki/Event_Socket_Library)
interface, and instead has it's own thing. This library was written to implement the full Event
Socket Library interface, and provide a meaningful semantic when dealing with FreeSWITCH in Node.js.

This library supports both "Inbound" (connection going _into_ FreeSWITCH) and "Outbound" (connections
coming _out_ of FreeSWITCH). Also included is a helper `esl.Server` object that manages multiple
`esl.Connection` objects; making it trivial to have multiple "Outbound" connections from FreeSWITCH.

### Installation

The easiest way to install is via npm:

```shell
npm install modesl
```

As in "Mod ESL".

### Usage

The most basic usage example is to open a connection, and send a status command:

```javascript
var esl = require('modesl'),
conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {
    conn.api('status', function(res) {
        //res is an esl.Event instance
        console.log(res.getBody());
    });
});
```

Something to be aware of is that _all_ functions that interact with FreeSWITCH are asynchronous on the Library side.
However, there are many functions (`api`, `execute`, etc) that are synchronous on the FreeSWITCH side. Because of this
the event you will get back in your callback on, for example, `api` and the same command on `bgapi` will be different.

The `api` command's callback will be executed immediately when the `command/reply` message is received, with all the
returned data. However, that same command using `bgapi` will _not_ call the callback when the `command/reply` message
is received, this is because FreeSWITCH returns the `command/reply` message immediately for background commands __before
the command is run__. The Library will automatically track the command, and call the callback on the `BACKGROUND_JOB`
message that denotes a completed Background Job.

The body for the same command issued with `api` and `bgapi` should be the same; even when the headers, event type, and
time it takes for the callback to execute are different. The Library attempts to smooth these differences out by providing
a common interface, even though behind the scenes things are quite different.

### Interface

This library exposes 3 main classes:

 * `esl.Connection`
 * `esl.Event`
 * `esl.Server`
 * `esl.Parser` (Used internally for parsing the raw socket stream; __not for public use__)

Which implement the [ESLconnection](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLconnection_Object)
and [ESLevent](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLevent_Object) interfaces, respectively.
The `esl.Server` object is for creating a server to manage multiple "Outbound" connections; that is, multiple
`esl.Connection` objects coming _from_ FreeSWITCH. The `esl` object actually exported from this module is
considered to implement the [ESL Object](http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESL_Object) interface.

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

> The standard method for using this function is to listen for an incomingconnection on a socket, accept
> the incoming connection from FreeSWITCH, fork a new copy of your process if you want to listen for more
> connections, and then pass the file number of the socket to new($fd).

However, node doesn't need to fork to accept multiple connections. But an `esl.Connection` instance should
still be only 1 Channel Connection instance. To solve this issue, the second form will accept an instance of
Node's [`net.Socket`](http://nodejs.org/api/net.html#net_class_net_socket). In this way you can do the server
management yourself (or using `esl.Server` to do it for you).

This changes the constructor call for an "Outbound" connection to look like:

```javascript
var conn = new esl.Connection(socket[, readyCallback]);
```

The readyCallback is called once the connection is stored, the `connect` command is issued, and a `CHANNEL_DATA` event is received.

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

### Library Events


Below is a comprehensive list of the events that the library can emit, along with parameters, and description.

Both the `esl.Connection` and `esl.Server` objects use [`EventEmitter2`](https://github.com/hij1nx/EventEmitter2)
to send namespaced events. For example every event raises the `esl::event::EVENT_NAME::EVENT_UUID` event, where
`EVENT_NAME` is the name of the event and `EVENT_UUID` is the uuid of the event. Listening to `esl::event::*` will
give you every event with any name with any uuid; whereas `esl::event::MESSAGE::*` will give you only each MESSAGE
event, reguardless of uuid.

#### `esl.Connection` Events

Here is the event list in the form of `event_name(param1 {type1}, ..., paramN {typeN})`:

<dl>
    <dt><code>error(err {Error})</code></dt>
    <dd>An error has occurred, this is not namespaced to <code>esl::</code> as to match node's error event system</dd>

    <dt><code>esl::connect()</code></dt>
    <dd>The connection has connected to FSW, but has not authenticated.</dd>

    <dt><code>esl::ready()</code></dt>
    <dd>The connection is ready; it is both connected and authenticated.</dd>
    
    <dt><code>esl::end()</code></dt>
    <dd>The connection to FreeSWITCH has closed</dd>

    <dt><code>esl::*([evt {esl.Event}])</code></dt>
    <dd>Will pick up any esl event emitted from the Library, including <code>connect</code> and other events with no parameters</dd>

    <dt><code>esl::event::*(evt {esl.Event})</code></dt>
    <dd>Called each time an event is picked up from FSW by the Client</dd>

    <dt><code>esl::event::EVENT_NAME::*(evt {esl.Event})</code></dt>
    <dd>Each event is emitted on this channel where <CODE>EVENT_NAME</CODE> is the Event's <code>Event-Name</code> header value</dd>

    <dt><code>esl::event::EVENT_NAME::EVENT_UUID(evt {esl.Event})</code></dt>
    <dd>Each event is emitted with a UUID, the <CODE>EVENT_UUID</CODE> is determined by first checking for a <code>Job-UUID</code> (background job uuid), then <code>Unique-ID</code> (channel uuid), and finally the <code>Core-UUID</code> (message's uuid). This to track a particular job, channel, or message stream.</dd>

    <dt><code>esl::event::auth::*([evt {esl.Event}])</code></dt>
    <dd>Picks up any auth event, whether it is <code>request</code>, <code>success</code>, or <code>fail</code></dd>

    <dt><code>esl::event::auth::request(evt {esl.Event})</code></dt>
    <dd>FSW has requested authentication from the Library; The Library with auth for you.</dd>

    <dt><code>esl::event::auth::success()</code></dt>
    <dd>Authentication with FSW has passed; the `readyCallback`, if specified, is also called.</dd>

    <dt><code>esl::event::auth::fail()</code></dt>
    <dd>Authentication with FSW has failed</dd>

    <dt><code>esl::event::command::reply(evt {esl.Event})</code></dt>
    <dd>A reply to an issued command has come back</dd>

    <dt><code>esl::event::api::response(evt {esl.Event})</code></dt>
    <dd>A response to an issued api command has come back</dd>

    <dt><code>esl::event::log::data(evt {esl.Event})</code></dt>
    <dd>A log event from FSW</dd>

    <dt><code>esl::event::disconnect::notice(evt {esl.Event})</code></dt>
    <dd>FSW has notified the library it will be disconnected</dd>

    <dt><code>esl::event::raw::*(evt {esl.Event})</code></dt>
    <dd>Captures any raw event that had a Content-Type the Library did not parse</dd>

    <dt><code>esl::event::raw::CONTENT_TYPE(evt {esl.Event})</code></dt>
    <dd>Any Content-Type not parsed by the library is emmited on this channel, where `CONTENT_TYPE` is the Event's `Content-Type` header value</dd>
</dl>

#### `esl.Server` Events

Here is the event list in the form of `event_name(param1 {type1}, ..., paramN {typeN})`:

<dl>
    <dt><code>connection::open(connection {esl.Connection})</code></dt>
    <dd>FreeSWITCH has opened a connection to the server, however the connection object is not ready to be used yet</dd>

    <dt><code>connection::ready(connection {esl.Connection})</code></dt>
    <dd>A newly opened connection is now ready to be used</dd>

    <dt><code>connection::close(connection {esl.Connection})</code></dt>
    <dd>A connection has been closed</dd>
</dl>

### Library API

Since this library implements the [Event Socket Library](http://wiki.freeswitch.org/wiki/Event_Socket_Library)
interface, the API is the same as on that page. The code is also ___heavily___ commented describing each
function in full. However, since some function prototypes changed slightly in translation, and for quick
reference they are listed below in the form `function_name(param1 {type1}, ..., paramN {typeN})`:

#### `esl` (Module Export)

 - `esl.setLogLevel([level {number}])`
 - `esl.Connection`
 - `esl.Event`
 - `esl.Server`

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
 - `subscribe(events {string|array}[, callback {function}]`
 - `originate(profile {string}, gateway {string}, number {string}[, app {string}][, sync {boolean}][, callback {function}])`
 - `message(to {string}, from {string}, profile {string}, body {string}[, subject {string}][, callback])`

#### `esl.Event`

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

#### `esl.Server`

 - `Server([options {object}][, readyCb {function}])`
  * `readyCb` is called once the server is listening for connections
  * `options` defaults to the following:
   - `{ port: 8022, host: '127.0.0.1', server: null }`
   - If server is specified it will be used instead of creating a server (and port/host will be ignored)
   - __WARNING:__ Only pass a `server` after its [`listening`](http://nodejs.org/api/net.html#net_event_listening) event has been fired.