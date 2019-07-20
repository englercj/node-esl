## FreeSWITCH ESL Bindings for Node.js [![Build Status](https://travis-ci.org/englercj/node-esl.svg?branch=master)](https://travis-ci.org/englercj/node-esl)

A Library for handling low-level FreeSWITCH ESLconnections, and associated ESLevents.

[Documentation](https://github.com/englercj/node-esl/wiki) - [Event Socket Library Spec](https://freeswitch.org/confluence/x/UgEQ)

### Purpose

This library was written to implement the full Event Socket Library interface, and provide a meaningful
semantic when dealing with FreeSWITCH in Node.js.

This library supports both "Inbound" (connection going _into_ FreeSWITCH) and "Outbound" (connections
coming _out_ of FreeSWITCH). Also included is a helper `Server` object that manages multiple
`Connection` objects; making it trivial to have multiple "Outbound" connections from FreeSWITCH.

### Installation

The easiest way to install is via npm:

```shell
npm install modesl
```

As in "Mod ESL".

### Usage

The most basic usage example is to open a connection, and send a status command:

```js
const esl = require('modesl');

const connectionOptions = {
    host: '127.0.0.1',
    port: 8021,
};
const connection = esl.Connection.createInbound(connectionOptions, 'ClueCon', function ()
{
    connection.api('status', function (res)
    {
        console.log(res.getBody());
    });
});
```

Something to be aware of is that all functions that interact with FreeSWITCH are asynchronous on the Library side.
However, there are many functions (`api`, `execute`, etc) that are synchronous on the FreeSWITCH side. Because of this
the event you will get back in your callback on, for example, `api` and the same command on `bgapi` will be different.

The `api` command's callback will be executed immediately when the `command/reply` message is received, with all the
returned data. However, that same command using `bgapi` will not call the callback when the `command/reply` message
is received, this is because FreeSWITCH returns the `command/reply` message immediately for background commands _before
the command is run_. The Library will automatically track the command, and call the callback on the `BACKGROUND_JOB`
message that denotes a completed Background Job.

The body for the same command issued with `api` and `bgapi` should be the same; even when the headers, event type, and
time it takes for the callback to execute are different. The Library attempts to smooth these differences out by providing
a common interface, even though behind the scenes things are quite different.

### License

This module is distributed under the [MIT License](https://opensource.org/licenses/MIT).
