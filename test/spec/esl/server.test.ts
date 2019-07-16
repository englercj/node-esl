import * as net from 'net';
import { expect } from 'chai';
import { eventChannelData } from '../../fixtures/data';
import { getServer } from '../../fixtures/helpers';
import { Server } from '../../../src/esl/Server';

describe('esl.Server', function ()
{
    it('Has the correct exports', function (done)
    {
        expect(Server).to.be.a('function');

        const server = new Server();

        testServerInstance(server);

        server.on('ready', function ()
        {
            server.close();
            done();
        });
    });

    it('Constructs with only a callback set', function (done)
    {
        const server = new Server(function ()
        {
            server.close();
            done();
        });

        testServerInstance(server);
    });

    it('Constructs with an existing server instance', function (done)
    {
        getServer(function (err, server)
        {
            if (err || !server)
                return done(err);

            const testServer = new Server({ server }, function ()
            {
                expect(testServer.server).to.equal(server);
                testServer.close();
                done();
            });
        });
    });

    describe('server events', function ()
    {
        let testServer: Server;

        before(function (done)
        {
            getServer(function (err, server)
            {
                if (err || !server)
                    return done(err);

                testServer = new Server({ server }, done);
            });
        });

        it('should emit connection::open event', function (done)
        {
            testServerEvent(done, testServer, 'connection::open');
        });

        it('should emit connection::ready event', function (done)
        {
            testServerEvent(done, testServer, 'connection::ready', eventChannelData);
        });

        it('should emit connection::close event', function (done)
        {
            testServerEvent(done, testServer, 'connection::close');
        });

        after(function ()
        {
            testServer.close();
        });
    });

    describe('bind events', function ()
    {
        let testServer: Server;

        before(function (done)
        {
            getServer(function (err, server)
            {
                if (err || !server)
                    return done(err);

                testServer = new Server({ server, myevents: true }, done);
            });
        });

        it('Emits connection::open event', function (done)
        {
            testServerEvent(done, testServer, 'connection::open')
        });

        it('Emits connection::ready event', function (done)
        {
            testServerEvent(done, testServer, 'connection::ready', eventChannelData);
        });

        it('Emits connection::close event', function (done)
        {
            testServerEvent(done, testServer, 'connection::close')
        });

        after(function ()
        {
            testServer.close();
        });
    });
});

function testServerEvent(done: Mocha.Done, server: Server, name: string, channelData?: string)
{
    const address = server.server.address();

    if (!address || typeof address === 'string')
        return done(new Error('Failed to read address of server.'));

    const socket = net.connect({ port: address.port });

    const timeout = setTimeout(function ()
    {
        socket.end();
        done(new Error("Connection Timeout"));
    }, 1500);

    server.once(name, function(c, id)
    {
        clearTimeout(timeout);

        expect(id).to.not.be.null;

        socket.end();
        done();
    });

    if (channelData)
    {
        socket.on('data', function (buffer)
        {
            const str = buffer.toString('utf8');

            if (str.indexOf('connect') !== -1)
            {
                socket.write(channelData + '\n');
            }

            if (server.bindEventsEnabled && str.indexOf('myevents') !== -1)
            {
                socket.write(channelData + '\n');
            }
        });
    }
    else
    {
        socket.end();
    }
}

function testServerInstance(server: Server)
{
    expect(server).to.be.an.instanceof(Server);

    expect(server.connections).to.be.an('object');
    expect(server.server).to.be.an.instanceOf(net.Server);
}
