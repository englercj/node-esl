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
            'normal': macros.testEvent(data.stream.normal, heads, Parser),
            'plain': macros.testEvent(data.stream.plain, heads, Parser),
            'json': macros.testEvent(data.stream.json, heads, Parser),
            'xml': macros.testEvent(data.stream.xml, heads, Parser)
        }
    }
}).export(module);