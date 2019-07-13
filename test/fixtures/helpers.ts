import * as net from 'net';
import { expect } from 'chai';
import { ICallback } from '../../src/utils';

export function testConnSend(args, expected, Connection)
{
    return {
        topic: getInboundConnection(Connection, function(o)
        {
            o.conn.socket.once('data', (data) =>
            {
                this.callback(o, data);
            });

            o.conn.send.apply(o.conn, args); //('send me', { header1: 'val1', header2: 'val2' });
        }),
        'writes correct data': function(o, data)
        {
            expect(data).to.equal(expected); //'send me\nheader1: val1\nheader2: val2\n\n');
            o.conn.socket.end();
        },
    };
}

export function nextPort(port: number)
{
    return port + 1;
}

export interface ITestServerOptions
{
    port?: number;
    host?: string;
    server?: net.Server;
}

export function getServer(options?: ITestServerOptions, cb?: ICallback<void>)
{
    options.port   = options.port   || 8000;
    options.host   = options.host   || null;
    options.server = options.server || net.createServer(function(){});

    function onListen() {
        options.server.removeListener('error', onError);

        cb(null, options.server)
    }

    function onError(err) {
        options.server.removeListener('listening', onListen);

        if(err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
            return cb(err);
        }

        options.port = macros.nextPort(options.port);
        macros.getServer(options, cb);
    }

    options.server.once('error', onError);
    options.server.once('listening', onListen);
    options.server.listen(options.port, options.host);
}

//macro for creating an echo server and socket connected to it
//useful for being able to send data to a socket listener by writing
//to that socket
export function getEchoServerSocket(cb) {
    //find an open port
    macros.getServer(function(err, server) {
        if(err) return cb(err);

        //echo anything on the server connection
        server.on('connection', function(c) {
            c.pipe(c);
        });

        //create a client socket to the server
        var client = net.connect({ port: server.address().port }, function() {
            if(cb) cb(null, client, server);
        });
    });
}

export function getInboundConnection(Conn, cb) {
    macros.getEchoServerSocket(function(err, client, server) {
        var conn = new Conn('localhost', server.address().port, 'ClueCon');

        if(cb) cb(err, conn);
    });
}
