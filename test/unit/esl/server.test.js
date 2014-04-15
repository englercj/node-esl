var data = require('../../fixtures/data'),
    heads = JSON.parse(data.event.json),
    macros = require('../../fixtures/macros'),
    Server = require('../../../lib/esl/server').Server,
    net = require('net');

describe('esl.Server', function() {
    it('should have the correct exports', function() {
        //is function
        expect(Server).to.be.a('function');

        var server = new Server();

        //is instance
        expect(server).to.be.an.instanceof(Server);

        //private functions
        expect(server._onConnection).to.be.a('function');
        expect(server._onListening).to.be.a('function');
        expect(server._generateId).to.be.a('function');

        //var defaults
        expect(server.connections).to.be.an('object');
        expect(server.port).to.be.a('number');
        expect(server.host).to.equal('127.0.0.1');
    });

    it('should use a custom server instance', function(done) {
        macros.getEchoServerSocket(function(err, client, server) {
            if(err) return done(err);

            var eslServer = new Server({ server: server }, function() {
                expect(eslServer.server).to.equal(server);

                done();
            });
        });
    });

    describe('server events', function() {
        var server;

        before(function(done) {
            macros.getServer(function(err, netServer) {
                if(err) return done(err);

                server = new Server({ server: netServer }, function() {
                    done();
                });
            });
        });

        it('should emit connection::open event', function(done) {
            testServerEvent(done, server, 'connection::open');
        });

        it('should emit connection::ready event', function(done) {
            testServerEvent(done, server, 'connection::ready', data.event.channelData);
        });

        it('should emit connection::close event', function(done) {
            testServerEvent(done, server, 'connection::close');
        });
    });

    describe('bind events', function() {
        var evtServer;

        before(function(done) {
            macros.getServer(function(err, server) {
                if(err) return done(err);

                evtServer = new Server({ server: server, myevents: true }, function() {
                    done();
                });
            });
        });

        it('should expose the bindEvents interface', function() {
            expect(evtServer.bindEvents).to.equal(true);
        });

        it('should emit connection::open event', function(done) {
            testServerEvent(done, evtServer, 'connection::open', data.event.cmdReply('ok'))
        });

        it('should emit connection::close event', function(done) {
            testServerEvent(done, evtServer, 'connection::close')
        });
    });
});

function testServerEvent(done, server, name, channelData) {
    var to;

    //setup event callback
    server.once(name, function(c, id) {
        clearTimeout(to);

        expect(id).to.not.be.null;
        done();
    });

    //setup timeout
    to = setTimeout(function() {
        done(new Error("Connection Timeout"));
    }, 1500);

    //create a connection
    var socket = net.connect({ port: server.port });

    if(channelData) {
        //when esl.Connection sends 'connect' event
        socket.on('data', function(data) {
            if(data.toString().indexOf('connect') !== -1) {
                //write channel data to it
                socket.write(channelData + '\n');

                //wait a tick and close
                process.nextTick(function() {
                    socket.end();
                });
            }
        });
    } else {
        //wait a tick and close
        process.nextTick(function() {
            socket.end();
        });
    }
}
