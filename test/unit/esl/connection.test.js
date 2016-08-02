var data = require('../../fixtures/data'),
    heads = JSON.parse(data.event.json),
    macros = require('../../fixtures/macros'),
    Connection = require('../../../lib/esl/Connection');

describe('esl.Connection', function() {
    describe('Outbound Connection', function() {
        var serverSocket, conn;

        before(function(done) {
            macros.getEchoServerSocket(function(err, client, server) {
                if(err) return done(err);

                serverSocket = server;
                conn = new Connection(client);
                done();
            });
        });

        it('should have the correct exports', function() {
            //is function
            expect(Connection).to.be.a('function');

            //is instance
            expect(conn).to.be.an.instanceof(Connection);

            testConnectionInstance(conn);
        });

        after(function() {
            conn.disconnect();
            serverSocket.close();
        });
    });

    describe('Inbound Connection', function() {
        var serverSocket, conn;

        before(function(done) {
            macros.getEchoServerSocket(function(err, client, server) {
                if(err) return done(err);

                serverSocket = server;
                // no need for the given client, we will set up a new one below.
                client.end();
                conn = new Connection('localhost', server.address().port, 'ClueCon');
                done();
            });
        });

        it('should have the correct exports', function() {
            //is function
            expect(Connection).to.be.a('function');

            //is instance
            expect(conn).to.be.an.instanceof(Connection);

            testConnectionInstance(conn);
        });

        describe('.socketDescriptor()', function() {
            it('should be null', function() {
                expect(conn.socketDescriptor()).to.be.null;
            });
        });

        describe('.connected()', function() {
            it('should be false', function() {
                expect(conn.connected()).to.equal(true);
            });
        });

        describe('.getInfo()', function() {
            it('should be null', function() {
                expect(conn.getInfo()).to.be.null;
            });
        });

        describe('.send()', function() {
            it('should write the correct data with many args', function(done) {
                testConnectionSend(
                    done,
                    conn,
                    ['send me', { header1: 'val1', header2: 'val2' }],
                    'send me\nheader1: val1\nheader2: val2\n\n'
                );
            });

            it('should write the correct data with one arg', function(done) {
                testConnectionSend(
                    done,
                    conn,
                    ['send me'],
                    'send me\n\n'
                );
            });
        });

        describe('.execute()', function() {
            var uuid = 'f6a2ae66-2a0d-4ede-87ae-1da2ef25ada5',
                uuid2 = 'a5eac28e-b623-463d-87ad-b9de90afaf33';

            it('should invoke the callback', function(done) {
                testChannelExecute(conn, 'playback', 'foo', uuid, function(evt) {
                    expect(evt.getHeader('Application')).to.equal('playback');
                    done();
                });
            });

            it('should invoke only one callback on the same session', function(done) {
                testChannelExecute(conn, 'hangup', '', uuid, function(evt) {
                    expect(evt.getHeader('Application')).to.equal('hangup');
                    done();
                });
            });

            it('should invoke a callback for a different session', function(done) {
                testChannelExecute(conn, 'hangup', '', uuid2, function(evt) {
                    expect(evt.getHeader('Application')).to.equal('hangup');
                    done();
                });
            });

        });

        /*,
        '.sendRecv()': {
            topic: function() { return null; },
            'should call callback': {
                topic: macros.getInboundConnection(Connection, function(o) {
                    var t = this;
                    o.conn.sendRecv('auth poopy', function(evt) {
                        t.callback(o, evt);
                    });

                    o.conn.socket.once('data', function() {
                        o.conn.socket.write(data.event.cmdReply('accepted'));
                    });
                }),
                'on command': function(o, evt) {
                    assert.equal(evt.getHeader('Reply-Text'), '+OK accepted');
                    assert.equal(evt.getHeader('Modesl-Reply-OK'), 'accepted');
                }
            },
            'should fire esl::event::command::reply': {
                topic: macros.getInboundConnection(Connection, function(o) {
                    var t = this;
                    o.conn.sendRecv('auth poopy');
                    o.conn.socket.once('data', function() {
                        o.conn.socket.write(data.event.cmdReply('accepted'));
                    });

                    o.conn.on('esl::event::command::reply', function(evt) {
                        t.callback(o, evt);
                    });
                }),
                'on command': function(o, evt) {
                    assert.equal(evt.getHeader('Reply-Text'), '+OK accepted');
                    assert.equal(evt.getHeader('Modesl-Reply-OK'), 'accepted');
                }
            }
        }*/

        after(function() {
            conn.disconnect();
            serverSocket.close();
        });
    });
});

function testConnectionInstance(conn) {
    //public low-level functions
    expect(conn.socketDescriptor).to.be.a('function');
    expect(conn.connected).to.be.a('function');
    expect(conn.getInfo).to.be.a('function');
    expect(conn.send).to.be.a('function');
    expect(conn.sendRecv).to.be.a('function');
    expect(conn.api).to.be.a('function');
    expect(conn.bgapi).to.be.a('function');
    expect(conn.sendEvent).to.be.a('function');
    expect(conn.recvEvent).to.be.a('function');
    expect(conn.recvEventTimed).to.be.a('function');
    expect(conn.filter).to.be.a('function');
    expect(conn.events).to.be.a('function');
    expect(conn.execute).to.be.a('function');
    expect(conn.executeAsync).to.be.a('function');
    expect(conn.setAsyncExecute).to.be.a('function');
    expect(conn.setEventLock).to.be.a('function');
    expect(conn.disconnect).to.be.a('function');

    //public high-level functions
    expect(conn.auth).to.be.a('function');
    expect(conn.subscribe).to.be.a('function');
    expect(conn.show).to.be.a('function');
    expect(conn.originate).to.be.a('function');
    expect(conn.message).to.be.a('function');

    //private functions
    expect(conn._noop).to.be.a('function');
    expect(conn._doExec).to.be.a('function');
    expect(conn._onError).to.be.a('function');
    expect(conn._onConnect).to.be.a('function');
    expect(conn._onEvent).to.be.a('function');

    //var defaults
    expect(conn.execAsync).to.equal(false);
    expect(conn.execLock).to.equal(false);
    expect(conn.authed).to.equal(false);
    expect(conn.channelData).to.be.null;
    expect(conn.cmdCallbackQueue).to.be.empty;
    expect(conn.apiCallbackQueue).to.be.empty;
}

function testConnectionSend(done, conn, args, expected) {
    conn.socket.once('data', function(data) {
        expect(data.toString('utf8')).to.equal(expected);
        done();
    });

    conn.send.apply(conn, args);
}

function sendChannelExecuteResponse(conn, appUuid, appName, appArg, uuid) {
    // condensed output from FreeSWITCH to test relevant parts.
    var resp = [
        'Event-Name: CHANNEL_EXECUTE_COMPLETE',
        'Unique-ID: ' + uuid,
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

function testChannelExecute(conn, appName, appArg, uuid, cb) {
    conn.socket.once('data', function(data) {
        data = data.toString('utf8');
        var lines = data.split('\n');

        expect(lines).to.contain('call-command: execute');
        expect(lines).to.contain('execute-app-name: ' + appName);
        expect(lines).to.contain('execute-app-arg: ' + appArg);

        // first send an unrelated message that should not be picked up.
        var otherUuid = 'fee64ea1-c11d-4a1b-9715-b755fed7a557';
        sendChannelExecuteResponse(conn, otherUuid, 'sleep', '1', uuid);

        var appUuid = /\nEvent-UUID: ([0-9a-f-]+)\n/.exec(data)[1];
        sendChannelExecuteResponse(conn, appUuid, appName, appArg, uuid);
    });

    conn.execute(appName, appArg, uuid, cb);
}
