var vows = require('vows'),
assert = require('assert'),
portfinder = require('portfinder'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),
macros = require('../test-utils/macros'),
cov = require('../test-utils/coverage'),

Server = cov.require('../../lib/esl/server').Server;

vows.describe('esl.Server').addBatch({
    'Should': {
	topic: function() {
	    var t = this;
	    portfinder.getPort(function(err, port) {
		if(err) throw err;

		var server = new Server({ port: port }, function() {
		    t.callback(null, server);
		});
	    });
	},
	'have the correct exports': function(s) {
	    //is function
	    assert.isFunction(Server);

	    //is instance
	    assert.isTrue(s instanceof Server);

	    //private functions
	    assert.isFunction(s._onConnection);
	    assert.isFunction(s._onListening);
	    assert.isFunction(s._generateId);

	    //var defaults
	    assert.isFunction(s.readyCb);
	    assert.isObject(s.connections);
	    assert.isNumber(s.port);
	    assert.strictEqual(s.host, '127.0.0.1');
	}
    }
}).export(module);