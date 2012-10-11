var vows = require('vows'),
assert = require('assert'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),
macros = require('../test-utils/macros'),
cov = require('../test-utils/coverage'),

Connection = cov.require('../../lib/esl/connection').Connection;

vows.describe('esl.Connection').addBatch({
    'Should': {
	topic: macros.getEchoServerSocket(function(o) {
	    var t = this;

	    o.conn = new Connection(o.socket);
	    this.callback(null, o);
	}),
	'have the correct exports': function(o) {
	    //is function
	    assert.isFunction(Connection);

	    //is instance
	    assert.isTrue(o.conn instanceof Connection);

	    //public low-level functions
	    assert.isFunction(o.conn.socketDescriptor);
	    assert.isFunction(o.conn.connected);
	    assert.isFunction(o.conn.getInfo);
	    assert.isFunction(o.conn.send);
	    assert.isFunction(o.conn.sendRecv);
	    assert.isFunction(o.conn.api);
	    assert.isFunction(o.conn.bgapi);
	    assert.isFunction(o.conn.sendEvent);
	    assert.isFunction(o.conn.recvEvent);
	    assert.isFunction(o.conn.recvEventTimed);
	    assert.isFunction(o.conn.filter);
	    assert.isFunction(o.conn.events);
	    assert.isFunction(o.conn.execute);
	    assert.isFunction(o.conn.executeAsync);
	    assert.isFunction(o.conn.setAsyncExecute);
	    assert.isFunction(o.conn.setEventLock);
	    assert.isFunction(o.conn.disconnect);

	    //public high-level functions
	    assert.isFunction(o.conn.auth);
	    assert.isFunction(o.conn.subscribe);
	    assert.isFunction(o.conn.show);
	    assert.isFunction(o.conn.originate);
	    assert.isFunction(o.conn.message);

	    //private functions
	    assert.isFunction(o.conn._noop);
	    assert.isFunction(o.conn._doExec);
	    assert.isFunction(o.conn._onError);
	    assert.isFunction(o.conn._onConnect);
	    assert.isFunction(o.conn._onEvent);

	    //var defaults
	    assert.isFalse(o.conn.execAsync);
	    assert.isFalse(o.conn.execLock);
	    assert.isFalse(o.conn.connecting);
	    assert.isFalse(o.conn.authed);
	    assert.isNull(o.conn.channelData);
	    assert.isEmpty(o.conn.cmdCallbackQueue);
	    assert.isEmpty(o.conn.apiCallbackQueue);
	}
    }
}).export(module);