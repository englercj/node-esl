import { expect } from 'chai';
import { logger } from '../../src/logger';
import { Event } from '../../src/esl/Event';

describe('Logger', function ()
{
    it('Has the correct exports', function ()
    {
        expect(logger.setLogFunction).to.be.a('function');
        expect(logger.setLogLevel).to.be.a('function');
        expect(logger.log).to.be.a('function');

        expect(logger.enabled).to.equal(false);
        expect(logger.level).to.equal(0);
    });

    it('Sets log level', function ()
    {
        logger.setLogLevel(7);
        expect(logger.level).to.equal(7);
    });

    it('Enables logging setting', function ()
    {
        logger.setLogLevel(7);
        expect(logger.enabled).to.equal(true);
    });

    describe('.log()', function ()
    {
        let evtObj: Event;

        beforeEach(function ()
        {
            evtObj = new Event({
                'Event-Name': 'CUSTOM',
                'Log-Level': '0',
                '_body': 'Derp.',
            });
        });

        it('Logs event body for non-debug level (<7)', function (done)
        {
            logger.setLogFunction(function (msg)
            {
                expect(msg).to.equal(evtObj.getBody());
                done();
            });

            logger.setLogLevel(5);
            logger.log(evtObj);
        });

        it('Logs entire event for debug level (7)', function (done)
        {
            logger.setLogFunction(function (msg)
            {
                expect(msg).to.equal(evtObj.serialize() + '\n\n' + evtObj.getBody());
                done();
            });

            logger.setLogLevel(7);
            logger.log(evtObj);
        });
    });
});
