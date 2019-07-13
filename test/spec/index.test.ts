import * as esl from '../../src';
import { expect } from 'chai';

describe('Event Socket Library', function()
{
    it('Has the correct exports', function()
    {
        expect(esl.setLogLevel).to.be.a('function');
        expect(esl.eslSetLogLevel).to.be.a('function');

        expect(esl.Event).to.be.a('function');
        expect(esl.Connection).to.be.a('function');
        expect(esl.Server).to.be.a('function');
        expect(esl.Parser).to.be.a('function');
    });
});
