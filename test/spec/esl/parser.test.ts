import * as net from 'net';
import { expect } from 'chai';
import { Parser } from '../../../src/esl/Parser';
import { getEchoServerAndSocket } from '../../fixtures/helpers';
import { Event } from '../../../src/esl/Event';
import {
    eventJson,
    streamNormal,
    streamPlain,
    streamJson,
    streamXml,
} from '../../fixtures/data';

const heads = JSON.parse(eventJson);

let parser: Parser;
let socket: net.Socket;

describe('esl.Parser', function ()
{
    let testServer: net.Server;

    before(function (done)
    {
        getEchoServerAndSocket(function (err, result)
        {
            if (err || !result)
                return done(err);

            socket = result.socket;
            testServer = result.server;
            parser = new Parser(socket);
            done();
        });
    });

    it('Has the correct exports', function ()
    {
        expect(Parser).to.be.a('function');
    });

    describe('normal (1 event)', describeEvents(streamNormal));
    describe('plain (1 event)', describeEvents(streamPlain));
    describe('json (1 event)', describeEvents(streamJson));
    describe('xml (1 event)', describeEvents(streamXml));

    describe('normal (2 events)', describeEvents(streamNormal + streamNormal));
    describe('plain (2 events)', describeEvents(streamPlain + streamPlain));
    describe('json (2 events)', describeEvents(streamJson + streamJson));
    describe('xml (2 events)', describeEvents(streamXml + streamXml));

    after(function ()
    {
        socket.end();
        testServer.close();
    });
});

function describeEvents(streamData: string)
{
    return function ()
    {
        it('Parses an event given all data at once', function (done)
        {
            parser.once('esl::event', testParserEvent.bind(null, done));
            socket.write(streamData);
        });

        it('Parses an event given one line at a time', function (done)
        {
            parser.once('esl::event', testParserEvent.bind(null, done));

            (function writeSocketLinesAsync(socket, lns, i)
            {
                if (i === lns.length)
                    return;

                socket.write(lns[i] + '\n');

                process.nextTick(function ()
                {
                    writeSocketLinesAsync(socket, lns, ++i);
                });
            })(socket, streamData.split('\n'), 0);
        });

        it('Parses an event given one character at a time', function (done)
        {
            parser.once('esl::event', testParserEvent.bind(null, done));

            (function writeSocketCharsAsync(socket, str, i)
            {
                if (i === str.length)
                    return;

                socket.write(str[i]);

                process.nextTick(function ()
                {
                    writeSocketCharsAsync(socket, str, ++i);
                });
            })(socket, streamData, 0);
        });
    };
}

function testParserEvent(done: Mocha.Done, evt: Event)
{
    expect(evt.getType()).to.equal(heads['Event-Name']);
    expect(evt.getHeader('Event-Name')).to.equal(heads['Event-Name']);
    expect(evt.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);
    expect(evt.getBody()).to.equal(heads._body);

    if(!heads['Content-Type'])
        expect(evt.getHeader('Content-Type')).to.be.null;
    else
        expect(evt.getHeader('Content-Type')).to.equal(heads['Content-Type']);

    done();
}
