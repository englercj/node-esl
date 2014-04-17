## FreeSWITCH ESL Bindings for Node.js [![Build Status](https://travis-ci.org/englercj/node-esl.svg?branch=master)](https://travis-ci.org/englercj/node-esl)

A Library for handling low-level FreeSWITCH ESLconnections, and associated ESLevents.

[Documentation](https://github.com/englercj/node-esl/wiki) - [Event Socket Library Spec](http://wiki.freeswitch.org/wiki/Esl)

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

### Tests

To run the tests included with the module simply run the following in the root of the `modesl` folder:

```shell
npm test
```

### TODO

 - Add tests for
  * `esl.Connection`
 - Add more examples for
  * IVR App
  * Faxing App
 - Add more abstraction/sugar functions
 - Better error messages on `error` event

### License

This module is distributed under the [Mozilla Public License 2.0](http://www.mozilla.org/MPL/2.0/).
