import * as net from 'net';
import { expect } from 'chai';
import { IErrorCallback } from '../../src/utils';
import { Connection } from '../../src/esl/Connection';

export type ITestSendArgs = [string] | [string, Partial<{ [key: string]: string }>];

// export function testConnSend(args: ITestSendArgs, expected: Buffer)
// {
//     return {
//         topic: getInboundConnection(function (err, result)
//         {
//             if (err || !result)
//                 throw err;

//             const conn = result.connection;
//             conn.socket.once('data', (data) => this.callback(conn, data));
//             conn.send.apply(conn, args); //('send me', { header1: 'val1', header2: 'val2' });
//         }),
//         'writes correct data': function (conn: Connection, data: Buffer)
//         {
//             expect(data).to.equal(expected); //'send me\nheader1: val1\nheader2: val2\n\n');
//             conn.socket.end();
//         },
//     };
// }

export interface ITestServerOptions
{
    port?: number;
    host?: string;
    server?: net.Server;
}

export function getServer(cb: IErrorCallback<net.Server>): void;
export function getServer(options: ITestServerOptions, cb: IErrorCallback<net.Server>): void;
export function getServer(optionsOrCallback: ITestServerOptions | IErrorCallback<net.Server>, callback?: IErrorCallback<net.Server>)
{
    let optionsArg: ITestServerOptions = {};

    if (typeof optionsOrCallback === 'function')
    {
        callback = optionsOrCallback;
    }
    else if (optionsOrCallback)
    {
        optionsArg = optionsOrCallback;
    }

    const cb = callback as NonNullable<typeof callback>;

    const options: Required<ITestServerOptions> = {
        port: optionsArg.port || 8000,
        host: optionsArg.host || '',
        server: optionsArg.server || net.createServer(),
    };

    const onListen = function ()
    {
        options.server.removeListener('error', onError);

        cb(null, options.server);
    }

    const onError = function (err: NodeJS.ErrnoException)
    {
        options.server.removeListener('listening', onListen);

        if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES')
        {
            cb(err);

            return;
        }

        ++options.port;
        getServer(options, cb);
    }

    options.server.once('error', onError);
    options.server.once('listening', onListen);
    options.server.listen(options.port, options.host);
}

export function getEchoServer(cb: IErrorCallback<net.Server>): void
{
    getServer(function (err, server)
    {
        if (err || !server)
            return cb(err);

        server.on('connection', (c) => c.pipe(c));

        cb(null, server);
    });
}

export function getEchoServerAndSocket(cb: IErrorCallback<{ socket: net.Socket, server: net.Server }>): void
{
    getEchoServer(function (err, server)
    {
        if (err || !server)
            return cb(err);

        const address = server.address();

        if (!address || typeof address === 'string')
            return cb(new Error('Failed to read echo server address'));

        const socket = net.connect({ port: address.port }, function ()
        {
            cb(null, { socket, server });
        });
    });
}

export function getInboundConnection(cb: IErrorCallback<{ connection: Connection, server: net.Server }>): void
{
    getEchoServer(function (err, server)
    {
        if (err || !server)
            return cb(err);

        const address = server.address();

        if (!address || typeof address === 'string')
            return cb(new Error('Failed to read echo server address'));

        const connection = Connection.createInbound('localhost', address.port, 'ClueCon');

        cb(err, { connection, server });
    });
}
