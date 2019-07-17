import * as net from 'net';
import * as uuid from 'uuid';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { getEchoServerAndSocket, getInboundConnection, ITestSendArgs } from '../../fixtures/helpers';
import { setupSinonChai } from '../../fixtures/setup';
import { Connection } from '../../../src/esl/Connection';
import { ICallback } from '../../../src/utils';
import { Event } from '../../../src/esl/Event';
import { cmdReply } from '../../fixtures/data';

setupSinonChai();

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

        describe('.sendRecv()', function ()
        {
            it('Calls callback when the data is returned', function (done)
            {
                testConnection.socket.once('data', function (buffer)
                {
                    testConnection.socket.write(cmdReply());
                });

                testConnection.sendRecv('auth test_password', function (evt)
                {
                    expect(evt.getHeader('Content-Type')).to.equal('command/reply');
                    expect(evt.getHeader('Reply-Text')).to.equal('+OK accepted');
                    expect(evt.getHeader('Modesl-Reply-OK')).to.equal('accepted');
                    done();
                });
            });

            it('Fires `esl::event::command::reply`', function (done)
            {
                testConnection.socket.once('data', function ()
                {
                    testConnection.socket.write(cmdReply());
                });

                testConnection.once('esl::event::command::reply', function (evt)
                {
                    expect(evt.getHeader('Content-Type')).to.equal('command/reply');
                    expect(evt.getHeader('Reply-Text')).to.equal('+OK accepted');
                    expect(evt.getHeader('Modesl-Reply-OK')).to.equal('accepted');
                    done();
                });

                testConnection.sendRecv('auth test_password');
            });
        });

        describe('.api()', function ()
        {
            it('Call the callback when `esl::event::api::response comes`', function (done)
            {
                const stub = function (buffer: Buffer)
                {
                    const data = buffer.toString('utf8');

                    if (data === 'api originate\n\n')
                    {
                        testConnection.emit('esl::event::api::response', 'event');
                    }
                };

                testConnection.socket.on('data', stub);

                testConnection.api('originate', function (response)
                {
                    expect(response).to.be.equal('event');
                    testConnection.socket.off('data', stub);
                    done();
                });
            });

            it('Gets the correct response for each call if called twice immediately', function (done)
            {
                const stub = function (buffer: Buffer)
                {
                    const data = buffer.toString('utf8');

                    if (data.indexOf('api originate1\n\n') !== -1)
                        testConnection.emit('esl::event::api::response', 'originate1');

                    if (data.indexOf('api originate2\n\n') !== -1)
                        testConnection.emit('esl::event::api::response', 'originate2');
                };

                testConnection.socket.on('data', stub);

                const testDone = function ()
                {
                    if (callback1.called && callback2.called)
                    {
                        testConnection.socket.off('data', stub);
                        done();
                    }
                }

                const callback1 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate1');
                    expect(callback2).to.not.be.called;
                    testDone();
                });

                const callback2 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate2');
                    expect(callback1).to.be.called;
                    testDone();
                });

                testConnection.api('originate1', callback1);
                testConnection.api('originate2', callback2);
            });

            it('Gets the correct response for each call if called twice delayed', function (done)
            {
                const stub = function (buffer: Buffer)
                {
                    const data = buffer.toString('utf8');

                    if (data.indexOf('api originate1\n\n') !== -1)
                        testConnection.emit('esl::event::api::response', 'originate1');

                    if (data.indexOf('api originate2\n\n') !== -1)
                        testConnection.emit('esl::event::api::response', 'originate2');
                };

                testConnection.socket.on('data', stub);

                const testDone = function ()
                {
                    if (callback1.called && callback2.called)
                    {
                        testConnection.socket.off('data', stub);
                        done();
                    }
                }

                const callback1 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate1');
                    expect(callback2).to.not.be.called;
                    testDone();
                });

                const callback2 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate2');
                    expect(callback1).to.be.called;
                    testDone();
                });

                testConnection.api('originate1', callback1);

                setTimeout(function ()
                {
                    testConnection.api('originate2', callback2);
                }, 20);
            });
        });

        describe('.bgapi()', function ()
        {
            it('Calls the callback when `esl::event::BACKGROUND_JOB::<jobId>` comes', function (done)
            {
                const stub = function (buffer: Buffer)
                {
                    const data = buffer.toString('utf8');

                    if (data === 'bgapi originate\nJob-UUID: jobid\n\n')
                        testConnection.emit('esl::event::BACKGROUND_JOB::jobid', 'event');
                };

                testConnection.socket.on('data', stub);

                testConnection.bgapi('originate', '', 'jobid', function (response)
                {
                    expect(response).to.be.equal('event');
                    testConnection.socket.off('data', stub);
                    done();
                })
            });

            it('Gets the correct response for each call if called twice', function (done)
            {
                const stub = function (buffer: Buffer)
                {
                    const data = buffer.toString('utf8');

                    if (data.indexOf('bgapi originate1\nJob-UUID: jobid1\n\n') !== -1)
                    {
                        setTimeout(function ()
                        {
                            testConnection.emit('esl::event::BACKGROUND_JOB::jobid1', 'originate1');
                        }, 20);
                    }

                    if (data.indexOf('bgapi originate2\nJob-UUID: jobid2\n\n') !== -1)
                        testConnection.emit('esl::event::BACKGROUND_JOB::jobid2', 'originate2');
                };

                testConnection.socket.on('data', stub);

                const testDone = function ()
                {
                    if (callback1.called && callback2.called)
                    {
                        testConnection.socket.off('data', stub);
                        done();
                    }
                }

                const callback1 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate1');
                    expect(callback2).to.be.called;
                    testDone();
                });

                const callback2 = sinon.spy(function (response)
                {
                    expect(response).to.be.equal('originate2');
                    expect(callback1).to.not.be.called;
                    testDone();
                });

                testConnection.bgapi('originate1', '', 'jobid1', callback1);
                testConnection.bgapi('originate2', '', 'jobid2', callback2);
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
