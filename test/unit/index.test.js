const esl = require('../../__build__/src').esl;
const Event = require('../../__build__/src').Event;
const Connection = require('../../__build__/src').Connection;
const Parser = require('../../__build__/src').Parser;
const Server = require('../../__build__/src').Server;

describe('Event Socket Library', function() {
    it('should have the correct exports', function() {
        //global functions
        expect(esl.setLogLevel).to.be.a('function');

        //ESL Objects
        expect(Event).to.be.a('function');
        expect(Connection).to.be.a('function');
        expect(Server).to.be.a('function');
        expect(Parser).to.be.a('function');
    });
});
