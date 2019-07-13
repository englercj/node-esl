import * as net from 'net';
import * as uuid from 'uuid';
import { EventEmitter2 } from 'eventemitter2';
import { Connection, ConnectionType } from './Connection';
import { ICallback, IDictionary } from '../utils';

export type IServerReadyCallback = ICallback<void>;

export interface IServerOptions
{
    myevents?: boolean;
    server?: net.Server;
    port?: number;
    host?: string;
}

export enum ServerEvent
{
    ConnectionOpen = 'connection::open',
    ConnectionReady = 'connection::ready',
    ConnectionClose = 'connection::close',
}

/**
 * A helper class for running a server that accepts multiple connections.
 */
export class Server extends EventEmitter2
{
    readonly connections: IDictionary<Connection> = {};
    readonly server: net.Server;

    private _bindEvents: boolean;

    /**
     *
     * @param [opts] Options for the server.
     * @param [readyCb] Callback to be called when the server is ready to accept connections.
     */
    constructor(readyCb?: IServerReadyCallback);
    constructor(options: IServerOptions, readyCb?: IServerReadyCallback);
    constructor(opts?: IServerOptions | IServerReadyCallback, readyCb?: IServerReadyCallback)
    {
        super({
            wildcard: true,
            delimiter: '::',
            maxListeners: 25,
        });

        if (typeof opts === 'function')
        {
            readyCb = opts as IServerReadyCallback;
            opts = undefined;
        }

        if (readyCb)
        {
            this.once('ready', readyCb);
        }

        this._bindEvents = opts && opts.myevents ? opts.myevents : false;

        if (opts && opts.server)
        {
            this.server = opts.server;

            // make sure we dont call the callback before the function returns
            process.nextTick(() => this.emit('ready'));

            this.server.on('connection', this._onConnection.bind(this));
        }
        else
        {
            const port = opts && opts.port ? opts.port : 8022;
            const host = opts && opts.host ? opts.host : '127.0.0.1';

            this.server = net.createServer(this._onConnection.bind(this));
            this.server.listen(port, host, () => this.emit('ready'));
        }
    }

    bindEventsEnabled()
    {
        return this._bindEvents;
    }

    close(callback?: (err?: Error | undefined) => void)
    {
        this.server.close(callback);
    }

    private _onConnection(socket: net.Socket)
    {
        const conn = new Connection(socket, ConnectionType.Outbound);
        const id = uuid.v4();

        this.connections[id] = conn;

        this.emit(ServerEvent.ConnectionOpen, conn, id);

        conn.on('esl::ready', () =>
        {
            if (this._bindEvents)
            {
                conn.sendRecv('myevents', () =>
                {
                    this.emit(ServerEvent.ConnectionReady, conn, id);
                });
            }
            else
            {
                this.emit(ServerEvent.ConnectionReady, conn, id);
            }
        });

        conn.on('esl::end', () =>
        {
            this.emit(ServerEvent.ConnectionClose, conn, id);
            delete this.connections[id];
        });
    }
}
