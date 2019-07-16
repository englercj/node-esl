import * as net from 'net';
import * as uuid from 'uuid';
import { expect } from 'chai';
import { getEchoServerAndSocket, getInboundConnection, ITestSendArgs } from '../../fixtures/helpers';
import { Connection } from '../../../src/esl/Connection';
import { ICallback } from '../../../src/utils';
import { Event } from '../../../src/esl/Event';

describe('esl.Connection', function ()
{
    describe('Outbound Connection', function ()
    {
        let testServer: net.Server;
        let testConnection: Connection;

        before(function (done)
        {
            getEchoServerAndSocket(function (err, result)
            {
                if (err || !result)
                    return done(err);

                testServer = result.server;
                testConnection = Connection.createOutbound(result.socket);
                done();
            });
        });

        it('Has the correct exports', function ()
        {
            expect(Connection).to.be.a('function');
            expect(testConnection).to.be.an.instanceof(Connection);

            testConnectionInstance(testConnection);
        });

        after(function ()
        {
            testConnection.disconnect();
            testServer.close();
        });
    });

    describe('Inbound Connection', function ()
    {
        let testServer: net.Server;
        let testConnection: Connection;

        before(function (done)
        {
            getInboundConnection(function (err, result)
            {
                if (err || !result)
                    return done(err);

                testServer = result.server;
                testConnection = result.connection;
                done();
            });
        });

        it('Has the correct exports', function ()
        {
            //is function
            expect(Connection).to.be.a('function');

            //is instance
            expect(testConnection).to.be.an.instanceof(Connection);

            testConnectionInstance(testConnection);
        });

        describe('.socketDescriptor()', function ()
        {
            it('Returns null', function ()
            {
                expect(testConnection.socketDescriptor()).to.be.null;
            });
        });

        describe('.connected()', function ()
        {
            it('Returns true', function ()
            {
                expect(testConnection.connected()).to.equal(true);
            });
        });

        describe('.getInfo()', function ()
        {
            it('Returns null', function ()
            {
                expect(testConnection.getInfo()).to.be.null;
            });
        });

        describe('.send()', function ()
        {
            it('Write the correct data with one arg', function (done)
            {
                testConnectionSend(
                    done,
                    testConnection,
                    ['send me'],
                    'send me\n\n',
                );
            });

            it('Writes the correct data with many args', function (done)
            {
                testConnectionSend(
                    done,
                    testConnection,
                    ['send me', { header1: 'val1', header2: 'val2' }],
                    'send me\nheader1: val1\nheader2: val2\n\n',
                );
            });
        });

        describe('.execute()', function ()
        {
            const id0 = uuid.v4();
            const id1 = uuid.v4();

            it('Invokes the callback', function (done)
            {
                testChannelExecute(testConnection, 'playback', 'foo', id0, function (evt)
                {
                    expect(evt.getHeader('Application')).to.equal('playback');
                    done();
                });
            });

            it('Invokes the callback only once for the same session', function (done)
            {
                testChannelExecute(testConnection, 'hangup', '', id0, function (evt)
                {
                    expect(evt.getHeader('Application')).to.equal('hangup');
                    done();
                });
            });

            it('Invokes the callback again for a new session', function (done)
            {
                testChannelExecute(testConnection, 'hangup', '', id1, function (evt)
                {
                    expect(evt.getHeader('Application')).to.equal('hangup');
                    done();
                });
            });

        });

        after(function ()
        {
            testConnection.disconnect();
            testServer.close();
        });
    });
});

function testConnectionInstance(conn: Connection)
{
    // public statics
    expect(Connection.createInbound).to.be.a('function');
    expect(Connection.createOutbound).to.be.a('function');

    // public low-level functions
    expect(conn.socketDescriptor).to.be.a('function');
    expect(conn.connected).to.be.a('function');
    expect(conn.getInfo).to.be.a('function');
    expect(conn.send).to.be.a('function');
    expect(conn.sendRecv).to.be.a('function');
    expect(conn.api).to.be.a('function');
    expect(conn.bgapi).to.be.a('function');
    expect(conn.sendEvent).to.be.a('function');
    expect(conn.filter).to.be.a('function');
    expect(conn.events).to.be.a('function');
    expect(conn.execute).to.be.a('function');
    expect(conn.executeAsync).to.be.a('function');
    expect(conn.setAsyncExecute).to.be.a('function');
    expect(conn.setEventLock).to.be.a('function');
    expect(conn.disconnect).to.be.a('function');

    // public high-level functions
    expect(conn.filterDelete).to.be.a('function');
    expect(conn.auth).to.be.a('function');
    expect(conn.subscribe).to.be.a('function');
    expect(conn.show).to.be.a('function');
    expect(conn.originate).to.be.a('function');
    expect(conn.message).to.be.a('function');

    // member defaults
    expect(conn.execAsync).to.equal(false);
    expect(conn.execLock).to.equal(false);
    expect(conn.authed).to.equal(false);

    // Not checked because it can race, and isn't super important to check here.
    // expect(conn.connecting).to.equal(false);
}

function testConnectionSend(done: Mocha.Done, conn: Connection, args: ITestSendArgs, expected: string)
{
    conn.socket.once('data', function (data)
    {
        expect(data.toString('utf8')).to.equal(expected);
        done(null);
    });

    conn.send.apply(conn, args);
}

function sendChannelExecuteResponse(conn: Connection, appUuid: string, appName: string, uniqueId: string)
{
    // condensed output from FreeSWITCH to test relevant parts.
    const resp = [
        'Event-Name: CHANNEL_EXECUTE_COMPLETE',
        'Unique-ID: ' + uniqueId,
        'Application: ' + appName,
        'Application-Response: _none_',
        'Application-UUID: ' + appUuid,
        '',
        '',
    ].join('\n');

    conn.socket.write('Content-Type: text/event-plain\n');
    conn.socket.write('Content-Length: ' + resp.length + '\n\n');
    conn.socket.write(resp);
}

function testChannelExecute(conn: Connection, appName: string, appArg: string, requestId: string, cb: ICallback<Event>)
{
    conn.socket.once('data', function (data)
    {
        const str = data.toString('utf8');
        const lines = str.split('\n');

        expect(lines).to.contain(`sendmsg ${requestId}`);
        expect(lines).to.contain('call-command: execute');
        expect(lines).to.contain(`execute-app-name: ${appName}`);
        expect(lines.some(x => x.includes('Event-UUID: '))).to.be.true;

        if (appArg)
        {
            expect(lines).to.contain(`execute-app-arg: ${appArg}`);
        }
        else
        {
            expect(lines).to.not.contain('execute-app-arg: ');
            expect(lines).to.not.contain('execute-app-arg: undefined');
            expect(lines).to.not.contain('execute-app-arg: null');
            expect(lines).to.not.contain('execute-app-arg: [object Object]');
        }

        // first send an unrelated message that should not be picked up.
        const otherUuid = uuid.v4();
        sendChannelExecuteResponse(conn, otherUuid, 'sleep', requestId);

        const match = /\nEvent-UUID: ([0-9a-f-]+)\n/.exec(str);
        const appUuid = match && match[1];

        if (appUuid)
            sendChannelExecuteResponse(conn, appUuid, appName, requestId);
    });

    conn.execute(appName, appArg, requestId, cb);
}
