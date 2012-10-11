var vows = require('vows'),
assert = require('assert'),
cov = require('./test-utils/coverage'),

esl = cov.require('../../lib/esl');

vows.describe('Event Socket Library Module').addBatch({
    'Should': {
	'have the correct exports': function() {
	    //global functions
	    assert.isFunction(esl.eslSetLogLevel);
	    assert.isFunction(esl.setLogLevel);
	    assert.equal(esl.eslSetLogLevel, esl.setLogLevel);
	    
	    //ESL Objects
	    assert.isFunction(esl.Event);
	    assert.isFunction(esl.Connection);
	    assert.isFunction(esl.Server);
	    assert.isFunction(esl.Parser);
	},
	'properly set': {
	    topic: function() {
		esl.setLogLevel(5);
		return true;
	    },
	    'log level': function() {
		assert.strictEqual(esl._level, 5);
	    },
	    'log setting': function() {
		assert.isTrue(esl._log);
	    }
	}	
    }
}).export(module);