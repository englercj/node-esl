import * as net from 'net';
import * as xml2js from 'xml2js';
import { Buffer } from 'buffer';
import { EventEmitter2 } from 'eventemitter2';
import { Event } from './Event';

export enum HeaderNames
{
    ContentLength = 'Content-Length',
    ContentType = 'Content-Type',
    ReplyText = 'Reply-Text',
    EventName = 'Event-Name',
    EventSubclass = 'Event-Subclass',
    JobUuid = 'Job-UUID',
}

export enum ParserEvent
{
    Error = 'error',
    Event = 'esl::event',
}

export type IHeadersMap = Partial<{ [key: string]: string }>;

export class Parser extends EventEmitter2
{
    buffer: Buffer = Buffer.alloc(0);

    private _bodyLen = 0;
    private _encoding = 'utf8';
    private _headers: IHeadersMap = {};

    constructor(public socket: net.Socket, encoding = 'utf8')
    {
        super({
            wildcard: true,
            delimiter: '::',
            maxListeners: 25,
        });

        this._encoding = encoding;

        socket.on('data', this._onData.bind(this));
        socket.on('end', this._onEnd.bind(this));
    }

    static parseHeaderText(text: string): IHeadersMap
    {
        const lines = text.split('\n');
        const headers: any = {};

        for (let i = 0; i < lines.length; ++i)
        {
            const line = lines[i];

            if (!line)
                continue;

            const data = lines[i].split(': ');
            const key = data.shift();
            const value = decodeURIComponent(data.join(': '));

            if (!key)
                continue;

            if (key === HeaderNames.ContentLength)
                headers[key] = parseInt(value, 10);
            else
                headers[key] = value;
        }

        return headers;
    }

    static parsePlainBody(text: string): { error: Error | null, headers: IHeadersMap }
    {
        // if the body is event-plain then it is just a bunch of key/value pairs
        const headerEnd = text.indexOf('\n\n');
        const headers = Parser.parseHeaderText(text.substring(0, headerEnd));
        const contentLengthHeader = headers[HeaderNames.ContentLength];
        let error: Error | null = null;

        if (contentLengthHeader)
        {
            const len = parseInt(contentLengthHeader, 10);
            const start = headerEnd + 2;
            const end = start + len;

            if (end > text.length)
                error = new Error('Invalid content length for plain body.');
            else
                headers._body = text.substring(start, end);
        }

        return { error, headers };
    }

    static parseXmlBody(xmlText: string): { error: Error | null, headers: IHeadersMap }
    {
        // In the form:
        // <event>
        //     <headers>...</headers>
        //     <Content-Length>4</Content-Length> [optional]
        //     <body>...</body> [optional]
        // </event>
        const parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false });
        let error: Error | null = null;
        let headers: IHeadersMap = {};

        // parsing the xml is synchronous
        parser.parseString(xmlText, (err: Error, data: any) =>
        {
            error = err;

            headers = data.headers;

            if (data.headers[HeaderNames.ContentLength])
                headers._body = data.body;
        });

        return { error, headers };
    }

    private _onData(data: Buffer): void
    {
        this.buffer = Buffer.concat([this.buffer, data], this.buffer.length + data.length);

        if (this._bodyLen > 0)
            this._parseBody();
        else
            this._parseHeaders();
    }

    private _onEnd(): void
    {
    }

    private _indexOfHeaderEnd(): number
    {
        for (let i = 0, len = this.buffer.length - 1; i < len; ++i)
        {
            // Check for '\n\n' pattern
            if (this.buffer[i] === 0x0a && this.buffer[i + 1] === 0x0a)
            {
                return i;
            }
        }

        return -1;
    }

    private _parseHeaders(): void
    {
        // get end of header marker
        const headEnd = this._indexOfHeaderEnd();

        // if the headers haven't ended yet, keep buffering
        if (headEnd === -1)
            return;

        // if the headers have ended pull out the header text
        const headText = this.buffer.toString(this._encoding, 0, headEnd);

        // remove header text from buffer
        this.buffer = this.buffer.slice(headEnd + 2);

        // parse text into object
        this._headers = Parser.parseHeaderText(headText);

        const contentLengthHeader = this._headers[HeaderNames.ContentLength];

        if (contentLengthHeader)
        {
            this._bodyLen = parseInt(contentLengthHeader, 10);

            if (this.buffer.length)
                this._parseBody();
        }
        else
        {
            this._parseEvent('');

            if (this.buffer.length)
                this._parseHeaders();
        }
    }

    private _parseBody(): void
    {
        if (this.buffer.length < this._bodyLen)
            return;

        const body = this.buffer.toString(this._encoding, 0, this._bodyLen);

        this.buffer = this.buffer.slice(this._bodyLen);
        this._bodyLen = 0;

        this._parseEvent(body);
        this._parseHeaders();
    }

    private _parseEvent(body: string): void
    {
        let data: IHeadersMap | null = null;

        switch (this._headers[HeaderNames.ContentType])
        {
            // parse body as JSON event data
            case 'text/event-json':
            {
                try
                {
                    data = JSON.parse(body);
                }
                catch(e)
                {
                    this.emit(ParserEvent.Error, e);
                    return;
                }
                break;
            }

            // parse body as PLAIN event data
            case 'text/event-plain':
            {
                const { error, headers } = Parser.parsePlainBody(body);

                if (error)
                    this.emit(ParserEvent.Error, error);

                data = headers;

                break;
            }

            // parse body as XML event data
            case 'text/event-xml':
            {
                const { error, headers } = Parser.parseXmlBody(body);

                if (error)
                    this.emit(ParserEvent.Error, error);

                data = headers;

                break;
            }
        }

        let event: Event;

        if (data)
            event = new Event(data);
        else
            event = new Event(this._headers, body);

        const reply = event.getHeader(HeaderNames.ReplyText);

        if (reply)
        {
            if (reply.indexOf('-ERR') === 0)
                event.addHeader('Modesl-Reply-ERR', reply.substring(5));
            else if (reply.indexOf('+OK') === 0)
                event.addHeader('Modesl-Reply-OK', reply.substring(4));
        }

        this.emit(ParserEvent.Event, event, this._headers, body);
    }
}
