import * as net from 'net';
import * as uuid from 'uuid';
import { EventEmitter2 } from 'eventemitter2';
import { Event } from './Event';
import { Parser, HeaderNames, ParserEvent } from './Parser';
import { ICallback, IFormat, isValidFormat, IErrorCallback, IDictionary } from '../utils';
import { logger } from '../logger';

export type IConnectionReadyCallback = ICallback<void>;
export type IEventCallback = ICallback<Event>;

export interface IOriginateOptions
{
    profile: string;
    number: string;
    gateway: string;
    app?: string;
    sync?: boolean;
}

export interface IMessageOptions
{
    to: string;
    from: string;
    profile: string;
    body: string;
    subject: string;
    deliveryConfirmation?: string;
}

export enum ConnectionType
{
    Outbound, // "Outbound" connection, coming from FSW
    Inbound, // "Inbound" connection, going into FSW
}

export enum ConnectionEvent
{
    AuthSuccess = 'esl::event::auth::success',
    AuthFail = 'esl::event::auth::fail',
    Connect = 'esl::connect',
    ChannelDataPrefix = 'esl::event::CHANNEL_DATA',
    End = 'esl::end',
    Error = 'error',
    Ready = 'esl::ready',
}

//- function(host, port, password)
//Initializes a new instance of ESLconnection, and connects to the
// host $host on the port $port, and supplies $password to freeswitch.
//
//Intended only for an event socket in "Inbound" mode. In other words,
// this is only intended for the purpose of creating a connection to
// FreeSWITCH that is not initially bound to any particular call or channel.
//
//Does not initialize channel information (since inbound connections are
// not bound to a particular channel). In plain language, this means that
// calls to getInfo() will always return NULL.
//
//- function(fd)
//Initializes a new instance of ESLconnection, using the existing file
// number contained in $fd.
//
//Intended only for Event Socket Outbound connections. It will fail on
// Inbound connections, even if passed a valid inbound socket.
//
//The standard method for using this function is to listen for an incoming
// connection on a socket, accept the incoming connection from FreeSWITCH,
// fork a new copy of your process if you want to listen for more connections,
// and then pass the file number of the socket to new($fd).
//
//NOTE: The Connection class only supports 1 connection from FSW, the second
//  ctor option will take in a net.Socket instance (gained from net.connect or
//  on a server's connection event). For multiple connections use esl.Server

/**
 * ESLconnection
 *
 * @see https://freeswitch.org/confluence/display/FREESWITCH/Event+Socket+Library#EventSocketLibrary-ESLconnectionObject
 */
export class Connection extends EventEmitter2
{
    execAsync = false;
    execLock = false;

    readonly type: ConnectionType;

    private _socket: net.Socket;
    private _reqEvents: string[];
    private _parser: Parser | null;

    private _authed = false;
    private _connecting = true;
    private _usingFilters = false;
    private _channelData: Event | null = null;
    private _cmdCallbackQueue: (IEventCallback | undefined)[] = [];
    private _apiCallbackQueue: (IEventCallback | undefined)[] = [];

    constructor(socket: net.Socket, type: ConnectionType, readyCallback?: IConnectionReadyCallback)
    {
        super({
            wildcard: true,
            delimiter: '::',
            maxListeners: 25,
        });

        this.type = type;
        this._socket = socket;
        this._reqEvents = ['BACKGROUND_JOB', 'CHANNEL_EXECUTE_COMPLETE'];
        this._parser = null;

        if (readyCallback)
            this.once(ConnectionEvent.Ready, readyCallback);

        if (type == ConnectionType.Inbound)
        {
            if (socket.connecting)
                socket.on('connect', () => this._onConnect());
            else
                this._onConnect();
        }
        else
        {
            this._onConnect();

            this.sendRecv('connect', () =>
            {
                this.subscribe(this._reqEvents, () =>
                {
                    this.emit(ConnectionEvent.Ready);
                });
            });

        }

        socket.on('error', (err: Error) =>
        {
            this.emit(ConnectionEvent.Error, err);
        });

        // Emit end when stream closes
        socket.on('end', () =>
        {
            this.emit(ConnectionEvent.End);
        });

        // Handle logdata events
        this.on('esl::event::logdata', function (event: Event)
        {
            logger.log(event);
        });

        // Handle command reply callbacks
        this.on('esl::event::command::reply', (event: Event) =>
        {
            if (this._cmdCallbackQueue.length === 0)
                return;

            const fn = this._cmdCallbackQueue.shift();

            if (fn && typeof fn === 'function')
                fn.call(this, event);
        });

        // Handle api response callbacks
        this.on('esl::event::api::response', (event: Event) =>
        {
            if (this._apiCallbackQueue.length === 0)
                return;

            const fn = this._apiCallbackQueue.shift();

            if (fn && typeof fn === 'function')
                fn.call(self, event);
        });
    }

    static createInbound(host: string, port: number, password: string, readyCallback?: IConnectionReadyCallback): Connection
    {
        const socket = net.connect({ host, port });
        const conn = new Connection(socket, ConnectionType.Inbound, readyCallback);

        conn.on('esl::event::auth::request', function ()
        {
            conn.auth(password);
        });

        return conn;
    }

    static createOutbound(socket: net.Socket, readyCallback?: IConnectionReadyCallback): Connection
    {
        return new Connection(socket, ConnectionType.Outbound, readyCallback);
    }

    get authed() { return this._authed; }
    get connecting() { return this._connecting; }
    get socket() { return this._socket; }

    /**
     * Lower-level ESL Specification
     * http://wiki.freeswitch.org/wiki/Event_Socket_Library
     */

    /**
     * Returns the node.js socket for the connection object, if the connection object is connected.
     * This is the same socket that was passed to the constructor.
     * If the connection is an `Inbound` connection, null is returned.
     */
    socketDescriptor() { return this.type === ConnectionType.Inbound ? null : this._socket; }

    /**
     * Test if the connection object is connected. Returns `true` if connected, `false` otherwise.
     */
    connected() { return (!this._connecting && !!this._socket); }

    /**
     * When FS connects to an "Event Socket Outbound" handler, it sends
     * a "CHANNEL_DATA" event as the first event after the initial connection.
     * getInfo() returns an ESLevent that contains this Channel Data.
     *
     * getInfo() returns `null` when used on an `Inbound` connection.
     */
    getInfo() { return this._channelData; }

    /**
     * Sends a command to FreeSWITCH.
     *
     * Does not wait for a reply. You should immediately call recvEvent
     * or recvEventTimed in a loop until you get the reply. The reply
     * event will have a header named "Content-Type" that has a value
     * of "api/response" or "command/reply".
     *
     * To automatically wait for the reply event, use sendRecv() instead of send().
     *
     * NOTE: This is a FAF method of sending a command
     */
    send(command: string, args?: IDictionary<string>): void
    {
        try
        {
            this._socket.write(command + '\n');

            if (args)
            {
                const keys = Object.keys(args);

                for (let i = 0; i < keys.length; ++i)
                {
                    const key = keys[i];
                    this._socket.write(`${key}: ${args[key]}\n`);
                }
            }

            this._socket.write('\n');
        }
        catch (e)
        {
            this.emit(ConnectionEvent.Error, e);
        }
    }

    /**
     * Internally sendRecv($command) calls send($command) then recvEvent(),
     * and returns an instance of ESLevent.
     *
     * recvEvent() is called in a loop until it receives an event with a header
     * named "content-type" that has a value of "api/response" or "command/reply",
     * and then returns it as an instance of ESLevent.
     *
     * Any events that are received by recvEvent() prior to the reply event are queued
     * up, and will get returned on subsequent calls to recvEvent() in your program.
     *
     * NOTE: This listens for a response when calling `.send()` doing recvEvent() in a loop
     * doesn't make sense in the contet of Node.
     */
    sendRecv(command: string, cb?: IEventCallback): void;
    sendRecv(command: string, args: IDictionary<string>, cb?: IEventCallback): void;
    sendRecv(command: string, argsOrCallback?: IDictionary<string> | IEventCallback, cb?: IEventCallback): void
    {
        let args;

        if (typeof argsOrCallback === 'function')
        {
            cb = argsOrCallback;
            args = undefined;
        }
        else
        {
            args = argsOrCallback;
        }

        this._cmdCallbackQueue.push(cb);

        this.send(command, args);
    }

    /**
     * Send an API command (https://freeswitch.org/confluence/display/FREESWITCH/mod_commands#Core_Commands)
     * to the FreeSWITCH server. This method blocks further execution until the command has been executed.
     *
     * api($command, $args) is identical to sendRecv("api $command $args").
     */
    api(command: string, cb?: IEventCallback): void;
    api(command: string, args: string | string[], cb?: IEventCallback): void;
    api(command: string, argsOrCallback?: string | string[] | IEventCallback, cb?: IEventCallback): void
    {
        let args: string | undefined;

        if (typeof argsOrCallback === 'function')
        {
            cb = argsOrCallback;
            args = '';
        }
        else if (Array.isArray(argsOrCallback))
        {
            args = argsOrCallback.join(' ');
        }
        else
        {
            args = argsOrCallback;
        }

        this._apiCallbackQueue.push(cb);

        if (args)
        {
            command += ` ${args}`;
        }

        this.send(`api ${command}`);
    }

    /**
     * Send a background API command to the FreeSWITCH server to be executed in
     * it's own thread. This will be executed in it's own thread, and is non-blocking.
     *
     * bgapi($command, $args) is identical to sendRecv("bgapi $command $args")
     */
    bgapi(command: string, cb?: IEventCallback): void;
    bgapi(command: string, args: string | string[], cb?: IEventCallback): void;
    bgapi(command: string, args: string | string[], jobid: string, cb?: IEventCallback): void;
    bgapi(command: string, argsOrCallback?: string | string[] | IEventCallback, jobidOrCallback?: string | IEventCallback, cb?: IEventCallback): void
    {
        let args: string | undefined;
        let jobid = uuid.v4();

        if (typeof argsOrCallback === 'function')
        {
            cb = argsOrCallback;
            args = '';
        }
        else
        {
            if (Array.isArray(argsOrCallback))
                args = argsOrCallback.join(' ');
            else
                args = argsOrCallback;

            if (typeof jobidOrCallback === 'function')
            {
                cb = jobidOrCallback;
            }
            else if (jobidOrCallback)
            {
                jobid = jobidOrCallback;
            }
        }

        if (args)
        {
            command += ` ${args}`;
        }

        if (this._usingFilters)
        {
            this._sendApiCommand(
                command,
                jobid,
                (cb) => this.filter(HeaderNames.JobUuid, jobid, cb),
                (cb) => this.filterDelete(HeaderNames.JobUuid, jobid, cb),
                cb);
        }
        else
        {
            this._sendApiCommand(
                command,
                jobid,
                (cb) => cb && cb(),
                (cb) => cb && cb(),
                cb);
        }
    }

    /**
     * NOTE: This is a wrapper around sendRecv, that uses an ESLevent for the data
     */
    sendEvent(event: Event, cb?: IEventCallback): void
    {
        const eventName = event.getHeader(HeaderNames.EventName);
        const serializedEvent = event.serialize();
        const command = `sendevent ${eventName}\n${serializedEvent}`;

        this.sendRecv(command, cb);
    }

    /**
     * See the event socket filter command (https://freeswitch.org/confluence/display/FREESWITCH/mod_event_socket#mod_event_socket-filter).
     */
    filter(header: string, value: string, cb?: IEventCallback): void
    {
        this._usingFilters = true;
        this.sendRecv(`filter ${header} ${value}`, cb);
    }

    filterDelete(header: string, cb?: IEventCallback): void;
    filterDelete(header: string, value: string, cb?: IEventCallback): void;
    filterDelete(header: string, valueOrCallback?: string | IEventCallback, cb?: IEventCallback): void
    {
        let value: string | undefined;

        if (typeof valueOrCallback === 'function')
        {
            cb = valueOrCallback;
            value = undefined;
        }

        let command = `filter delete ${header}`;

        if (value)
        {
            command += ` ${value}`;
        }

        this.sendRecv(command, cb);
    }

    /**
     * $event_type can have the value "plain" or "xml" or "json". Any other value specified
     * for $event_type gets replaced with "plain".
     *
     * See the event socket event command for more info (https://freeswitch.org/confluence/display/FREESWITCH/mod_event_socket#mod_event_socket-event).
     */
    events(format: IFormat, cb?: IEventCallback): void;
    events(format: IFormat, events: string | string[], cb?: IEventCallback): void;
    events(format: IFormat, eventsOrCallback?: string | string[] | IEventCallback, cb?: IEventCallback): void
    {
        let events: string[] = ['all'];

        if (typeof eventsOrCallback === 'function')
        {
            cb = eventsOrCallback;
        }
        else if (eventsOrCallback)
        {
            if (Array.isArray(eventsOrCallback))
                events = eventsOrCallback;
            else
                events = eventsOrCallback.split(' ');
        }

        if (!isValidFormat(format))
            format = 'plain';

        const isAll = events.length === 1 && events[0] === 'all';

        if (!isAll)
        {
            for (let i = 0; i < this._reqEvents.length; ++i)
            {
                if (events.indexOf(this._reqEvents[i]) !== -1)
                    continue;

                events.push(this._reqEvents[i]);
            }
        }

        const command = `event ${format} ${events.join(' ')}`;

        this.sendRecv(command, cb);
    }

    /**
     * Execute a dialplan application (https://freeswitch.org/confluence/display/FREESWITCH/mod_dptools#Applications),
     * and wait for a response from the server.
     * On socket connections not anchored to a channel (most of the time inbound),
     * all three arguments are required -- $uuid specifies the channel to execute
     * the application on.
     *
     * Returns an ESLevent object containing the response from the server. The
     * getHeader("Reply-Text") method of this ESLevent object returns the server's
     * response. The server's response will contain "+OK [Success Message]" on success
     * or "-ERR [Error Message]" on failure.
     */
    execute(app: string, cb?: IEventCallback): string;
    execute(app: string, arg: string, cb?: IEventCallback): string;
    execute(app: string, arg: string, uuid: string, cb?: IEventCallback): string;
    execute(app: string, argOrCallback?: string | IEventCallback, uuidOrCallback?: string | IEventCallback, cb?: IEventCallback): string
    {
        let arg = '';
        let uniqueId = uuid.v4();

        if (typeof argOrCallback === 'function')
        {
            cb = argOrCallback;
        }
        else
        {
            if (argOrCallback)
                arg = argOrCallback;

            if (typeof uuidOrCallback === 'function')
            {
                cb = uuidOrCallback;
            }
            else if (uuidOrCallback)
            {
                uniqueId = uuidOrCallback;
            }
        }

        const options = {
            'execute-app-name': app,
            'execute-app-arg': arg,
        };

        if (this.type === ConnectionType.Inbound)
        {
            return this._sendExecute(uniqueId, options, cb);
        }
        else if (this._channelData)
        {
            const infoUniqueId = this._channelData.getHeader('Unique-ID');

            if (infoUniqueId)
                return this._sendExecute(infoUniqueId, options, cb);
        }

        return '';
    }

    /**
     * Same as execute, but doesn't wait for a response from the server.
     *
     * This works by causing the underlying call to execute() to append
     * "async: true" header in the message sent to the channel.
     */
    executeAsync(app: string, cb?: IEventCallback): string;
    executeAsync(app: string, arg: string, cb?: IEventCallback): string;
    executeAsync(app: string, arg: string, uuid: string, cb?: IEventCallback): string;
    executeAsync(app: string, argOrCallback?: string | IEventCallback, uuidOrCallback?: string | IEventCallback, cb?: IEventCallback): string
    {
        const oldAsyncValue = this.execAsync;
        this.execAsync = true;

        const eventUuid = this.execute(app, argOrCallback as string, uuidOrCallback as string, cb);

        this.execAsync = oldAsyncValue;

        return eventUuid;
    }

    /**
     * Force async mode on for a socket connection. This command has
     * no effect on outbound socket connections that are set to "async"
     * in the dialplan and inbound socket connections, since these
     * connections are already set to async mode on.
     *
     * value should be `true` to force async mode, and `false` to not force it.
     *
     * Specifically, calling setAsyncExecute(true) operates by causing future calls
     * to execute() to include the "async: true" header in the message sent to
     * the channel. Other event socket library routines are not affected by this call.
     */
    setAsyncExecute(value: boolean): void
    {
        this.execAsync = value;
    }

    /**
     * Force sync mode on for a socket connection. This command has no effect on
     * outbound socket connections that are not set to "async" in the dialplan,
     * since these connections are already set to sync mode.
     *
     * $value should be `true` to force sync mode, and `false` to not force it.
     *
     * Specifically, calling setEventLock(1) operates by causing future calls to
     * execute() to include the "event-lock: true" header in the message sent
     * to the channel. Other event socket library routines are not affected by this call.
     *
     * See Also:
     * Q: Ordering and async keyword
     *      (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Ordering_and_async_keyword)
     * Q: Can I bridge a call with an Outbound Socket?
     *      (http://wiki.freeswitch.org/wiki/Event_socket_outbound#Q:_Can_I_bridge_a_call_with_an_Outbound_socket_.3F)
     */
    setEventLock(value: boolean): void
    {
        this.execLock = value;
    }

    /**
     * Close the socket connection to the FreeSWITCH server.
     */
    disconnect(): void
    {
        this.send('exit');
        this._socket.end();
    }

    /**
     * Higher-level Library-Specific Functions
     * Some of these simply provide syntatic sugar
     */
    auth(password: string, cb?: IErrorCallback<Event>): void
    {
        this.sendRecv(`auth ${password}`, (event) =>
        {
            if (event.getHeader('Modesl-Reply-OK') === 'accepted')
            {
                this._authed = true;

                this.subscribe(this._reqEvents);

                this.emit(ConnectionEvent.AuthSuccess, event);
                this.emit(ConnectionEvent.Ready);

                if (cb)
                    cb(null, event);
            }
            else
            {
                this._authed = false;
                this.emit(ConnectionEvent.AuthFail, event);

                if (cb)
                    cb(new Error('Authentication Failed'), event);
            }
        });
    }

    /**
     * Subscribe to events using json format (native support)
     */
    subscribe(events: string| string[], cb?: IEventCallback): void
    {
        events = events || 'all';

        this.events('json', events, cb);
    }

    /**
     * Wraps the show mod_commands function and parses the return value into a javascript array
     */
    show(item: string, cb?: IErrorCallback<any[]>): void
    {
        this.bgapi(`show ${item} as json`, (event) =>
        {
            const body = event.getBody();
            let parsed = {};

            if (body.indexOf('-ERR') !== -1)
            {
                if (cb)
                    cb(new Error(body));

                return;
            }

            try
            {
                const parsed = JSON.parse(body);

                if(cb)
                    cb(null, parsed.rows);
            }
            catch (e)
            {
                if(cb)
                    cb(e);
            }
        });
    }

    /**
     * make an originating call
     */
    originate(options: IOriginateOptions, cb?: IEventCallback): void
    {
        let arg = `sofia/${options.profile}/${options.number}@${options.gateway}`;

        if (options.app)
            arg += ` &${options.app}`;

        if (options.sync)
            this.api('originate', arg, cb);
        else
            this.bgapi('originate', arg, cb);
    }

    /**
     * Send a SIP MESSAGE (SMS)
     */
    message(options: IMessageOptions, cb?: IEventCallback): void
    {
        const event = new Event('custom', 'SMS::SEND_MESSAGE');

        event.addHeader('proto', 'sip');
        event.addHeader('dest_proto', 'sip');

        event.addHeader('from', `sip:${options.from}`);
        event.addHeader('from_full', `sip:${options.from}`);

        event.addHeader('to', options.to);
        event.addHeader('sip_profile', options.profile);
        event.addHeader('subject', options.subject);

        if (options.deliveryConfirmation)
            event.addHeader('blocking', 'true');

        event.addHeader('type', 'text/plain');
        event.addHeader('Content-Type', 'text/plain');

        event.addBody(options.body);

        this.sendEvent(event, cb);
    }

    /**
     *
     */
    private _sendApiCommand(
        command: string,
        jobid: string,
        addToFilter: (cb?: () => void) => void,
        removeFromFilter: (cb?: () => void) => void,
        cb?: IEventCallback): void
    {
        const params = { [HeaderNames.JobUuid]: jobid };

        addToFilter(() =>
        {
            if (cb)
            {
                this.once(`esl::event::BACKGROUND_JOB::${jobid}`, (event: Event) =>
                {
                    removeFromFilter(() => cb(event));
                });
            }
            else
            {
                removeFromFilter();
            }

            this.sendRecv(`bgapi ${command}`, params);
        });
    }

    /**
     * Helper for execute, sends the actual message
     */
    private _sendExecute(uniqueId: string, args: IDictionary<string>, cb?: IEventCallback): string
    {
        args['call-command'] = 'execute';

        if (this.execAsync)
            args['async'] = 'true';

        if (this.execLock)
            args['event-lock'] = 'true';

        // this method of event tracking is based on:
        // http://lists.freeswitch.org/pipermail/freeswitch-users/2013-May/095329.html
        const eventUuid = uuid.v4();
        args['Event-UUID'] = eventUuid;

        const eventName = `esl::event::CHANNEL_EXECUTE_COMPLETE::${uniqueId}`;
        const cbWrapper = (event: Event) =>
        {
            const id = event.getHeader('Application-UUID') || event.getHeader('Event-UUID');

            if (args['Event-UUID'] === id)
            {
                this.removeListener(eventName, cbWrapper);

                if (cb)
                    cb(event);
            }
        };

        this.on(eventName, cbWrapper);

        this.send(`sendmsg ${uniqueId}`, args);

        return eventUuid;
    }

    /**
     * Called when socket connects to FSW ESL Server or when we successfully listen to the fd
     */
    private _onConnect()
    {
        this._parser = new Parser(this._socket);

        this._parser.on(ParserEvent.Event, this._onEvent.bind(this));
        this._parser.on(ParserEvent.Error, (err: Error) => this.emit(ConnectionEvent.Error, err));

        this._connecting = false;
        this.emit(ConnectionEvent.Connect);
    }

    /**
     * When we get a generic ESLevent from FSW
     */
    private _onEvent(event: Event, headers: IDictionary<string>, body: string)
    {
        const uniqueId = event.getHeader('Job-UUID') || event.getHeader('Unique-ID') || event.getHeader('Core-UUID');
        let emitName = 'esl::event';

        // massage Content-Types into event names,
        // since not all events actually have an Event-Name
        // header; we have to make our own
        switch(headers[HeaderNames.ContentType])
        {
            case 'auth/request':
                emitName += '::auth::request';
                break;

            case 'command/reply':
                emitName += '::command::reply';

                if (headers[HeaderNames.EventName] === 'CHANNEL_DATA')
                {
                    if (this.type === ConnectionType.Outbound)
                    {
                        this._channelData = event;
                        const suffix = uniqueId ? `::${uniqueId}` : '';
                        this.emit(ConnectionEvent.ChannelDataPrefix + suffix, event);
                    }
                }
                break;

            case 'log/data':
                emitName += '::logdata';
                break;

            case 'text/disconnect-notice':
                emitName += '::disconnect::notice';
                break;

            case 'api/response':
                emitName += '::api::response';
                break;


            case 'text/event-json':
            case 'text/event-plain':
            case 'text/event-xml':
                emitName += '::' + event.getHeader(HeaderNames.EventName) + (!!uuid ? '::' + uuid : '');
                break;

            default:
                emitName += '::raw::' + headers[HeaderNames.ContentType];
        }

        this.emit(emitName, event, headers, body);
    }
}
