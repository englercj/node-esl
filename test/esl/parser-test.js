var vows = require('vows'),
assert = require('assert'),

data = require('../test-utils/data'),
heads = JSON.parse(data.event.json),
macros = require('../test-utils/macros'),
cov = require('../test-utils/coverage'),

Parser = cov.require('../../lib/esl/parser').Parser;

vows.describe('esl.Parser').addBatch({
    'Should': {
	'have the correct exports': function() {
	    //is function
	    assert.isFunction(Parser);
	},
	'parse': {
	    topic: macros.getEchoServerSocket(function(o) {
		o.parser = new Parser(o.socket);
		this.callback(null, o);
	    }),
	    'normal': macros.parseEvent(data.stream.normal, heads),
	    'plain': macros.parseEvent(data.stream.plain, heads),
	    'json': macros.parseEvent(data.stream.json, heads),
	    'xml': macros.parseEvent(data.stream.xml, heads)
	}
    }
}).export(module);