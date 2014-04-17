var esl = require('../../lib/index');

describe('Event Socket Library', function() {
    it('should have the correct exports', function() {
        //global functions
        expect(esl.eslSetLogLevel).to.be.a('function');
        expect(esl.setLogLevel).to.be.a('function');
        expect(esl.eslSetLogLevel).to.equal(esl.setLogLevel);

        //ESL Objects
        expect(esl.Event).to.be.a('function');
        expect(esl.Connection).to.be.a('function');
        expect(esl.Server).to.be.a('function');
        expect(esl.Parser).to.be.a('function');
    });
});
