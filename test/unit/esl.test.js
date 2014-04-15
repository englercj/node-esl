var esl = require('../../lib/esl');

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

    it('should properly set log level', function() {
        esl.setLogLevel(7);
        expect(esl._level).to.equal(7);
    });

    it('should properly set log setting', function() {
        esl.setLogLevel(7);
        expect(esl._log).to.equal(true);
    });

    describe('logger', function() {
        var evtObj;

        beforeEach(function() {
            evtObj = new esl.Event({
                'Event-Name': 'CUSTOM',
                'Log-Level': 0,
                '_body': 'Derp.'
            });
        });

        it('should log a string message', function(done) {
            esl._logger = function(msg) {
                expect(msg).to.equal(evtObj.getBody());
                done();
            };

            esl.setLogLevel(5);
            esl._doLog(evtObj);
        });

        it('should log a debug message', function(done) {
            esl._logger = function(msg) {
                expect(msg).to.equal(evtObj.serialize() + '\n\n' + evtObj.getBody());
                done();
            };

            esl.setLogLevel(7);
            esl._doLog(evtObj);
        });
    });
});
