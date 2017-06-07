import * as net from 'net';
import * as crypto from 'crypto';
import { Connection } from './connection';
import { EventEmitter2 } from 'eventemitter2';

export class Server extends EventEmitter2 {

    connections: {[id: string]: Connection};
    seq: number;
    bindEvents: any;
    server: net.Server;
    port: number;
    host: string;

    constructor() {
        super({
            wildcard: true,
            delimiter: '::',
            maxListeners: 25
        });
    }

    initialize(opts: any, readyCb: () => any) {
        if (typeof opts === 'function') {
            readyCb = opts;
            opts = null;
        }

        readyCb = readyCb || function () { };

        this.connections = {};

        //OR 0 will floor the value
        this.seq = Date.now() | 0;

        this.once('ready', readyCb);

        opts = opts || {};

        this.bindEvents = opts.myevents || false;

        if (opts.server) {
            this.port = opts.server.address().port;
            this.host = opts.server.address().host;

            this.server = opts.server;

            //make sure we dont call the callback before the function returns
            const self = this;
            process.nextTick(function () {
                self.emit('ready');
            });

            this.server.on('connection', this._onConnection.bind(this));
        }
        else {
            this.port = opts.port || 8022;
            this.host = opts.host || '127.0.0.1';

            this.server = net.createServer(this._onConnection.bind(this));
            this.server.listen(this.port, this.host, this._onListening.bind(this));
        }
    }

    close(callback: () => any) {
        this.server.close(callback);
    }
    _onConnection(socket: net.Socket) {
        const conn = new Connection(),
            id = this._generateId();

        conn.initialize(socket);

        this.connections[id] = conn;
        this.connections[id]._id = id;

        this.emit('connection::open', conn, id);

        conn.on('esl::ready', function (id: string) {
            if (this.bindEvents) {
                conn.sendRecv('myevents', function () {
                    this.emit('connection::ready', this.connections[id], id);
                }.bind(this));
            } else {
                this.emit('connection::ready', this.connections[id], id);
            }
        }.bind(this, id));

        conn.on('esl::end', function (id: string) {
            this.emit('connection::close', this.connections[id], id);

            delete this.connections[id];
        }.bind(this, id));
    }
    _onListening = function () {
        this.emit('ready');
    }
    _generateId = function () {
        const rand = new Buffer(15); // multiple of 3 for base64

        //next in sequence
        this.seq = (this.seq + 1) | 0;

        //write sequence to last 4 bytes of buffer
        rand.writeInt32BE(this.seq, 11);

        //write random to first 11 bytes of buffer
        crypto.randomBytes(11).copy(rand);

        //make the base64 safe for an object property
        return rand.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
    }
}

