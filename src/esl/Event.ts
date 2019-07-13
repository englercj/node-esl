import { encodeXml, IFormat } from '../utils';
import { IHeadersMap, HeaderNames } from './Parser';

/**
 * ESLevent
 *
 * @see https://freeswitch.org/confluence/display/FREESWITCH/Event+Socket+Library#EventSocketLibrary-ESLeventObject
 */
export class Event
{
    private _headers: IHeadersMap = {};
    private _type: string;
    private _subclass: string;
    private _body: string;

    private _headerIndex = -1;

    constructor(headers: IHeadersMap, body?: string);
    constructor(type: string, subclass?: string);
    constructor(typeOrHeaders: IHeadersMap | string, subclassOrBody?: string)
    {
        if (typeof typeOrHeaders === 'string')
        {
            this._type = typeOrHeaders;
            this._subclass = subclassOrBody || '';
            this._body = '';

            this.addHeader(HeaderNames.EventName, this._type);

            if (this._subclass)
                this.addHeader(HeaderNames.EventSubclass, this._subclass);
        }
        else
        {
            this._type = typeOrHeaders[HeaderNames.EventName] || '';
            this._subclass = typeOrHeaders[HeaderNames.EventSubclass] || '';
            this._body = subclassOrBody || typeOrHeaders._body || '';

            this._headers = typeOrHeaders;
            delete this._headers._body;
        }

        this.delHeader('Content-Length');
    }

    get type() { return this._type; }
    get body() { return this._body; }
    get headers(): Readonly<IHeadersMap> { return this._headers; }

    /**
     * Turns an event into colon-separated 'name: value'
     * pairs similar to a sip/email packet
     * (the way it looks on '/events plain all').
     */
    serialize(format: IFormat = 'json'): string
    {
        switch (format)
        {
            /*
            {
                "Event-Name": "CUSTOM",
                "Core-UUID": "8b192020-7368-4498-9b11-cbe10f48a784",
                "FreeSWITCH-Hostname": "smsdev",
                "FreeSWITCH-Switchname": "smsdev",
                "FreeSWITCH-IPv4": "10.1.12.115",
                "FreeSWITCH-IPv6": "::1",
                "Event-Date-Local": "2012-09-25 14:22:37",
                "Event-Date-GMT": "Tue, 25 Sep 2012 18:22:37 GMT",
                "Event-Date-Timestamp": "1348597357036551",
                "Event-Calling-File": "switch_cpp.cpp",
                "Event-Calling-Function": "Event",
                "Event-Calling-Line-Number": "262",
                "Event-Sequence": "11027",
                "Event-Subclass": "SMS::SEND_MESSAGE",
                "proto": "sip",
                "dest_proto": "sip",
                "from": "9515529832",
                "from_full": "9515529832",
                "to": "internal/8507585138@sms-proxy-01.bandwidthclec.com",
                "subject": "PATLive Testing",
                "type": "text/plain",
                "hint": "the hint",
                "replying": "true",
                "Content-Length": "23",
                "_body": "Hello from Chad Engler!"
            }
            */
            case 'json':
            {
                const obj = Object.assign({}, this._headers);

                if (this._body)
                {
                    obj[HeaderNames.ContentLength] = Buffer.byteLength(this._body, 'utf8').toString();
                    obj._body = this._body;
                }

                return JSON.stringify(obj, null, 4);
            }

            /*
            Event-Name: CUSTOM
            Core-UUID: 8b192020-7368-4498-9b11-cbe10f48a784
            FreeSWITCH-Hostname: smsdev
            FreeSWITCH-Switchname: smsdev
            FreeSWITCH-IPv4: 10.1.12.115
            FreeSWITCH-IPv6: %3A%3A1
            Event-Date-Local: 2012-09-25%2014%3A21%3A56
            Event-Date-GMT: Tue,%2025%20Sep%202012%2018%3A21%3A56%20GMT
            Event-Date-Timestamp: 1348597316736546
            Event-Calling-File: switch_cpp.cpp
            Event-Calling-Function: Event
            Event-Calling-Line-Number: 262
            Event-Sequence: 11021
            Event-Subclass: SMS%3A%3ASEND_MESSAGE
            proto: sip
            dest_proto: sip
            from: 9515529832
            from_full: 9515529832
            to: internal/8507585138%40sms-proxy-01.bandwidthclec.com
            subject: PATLive%20Testing
            type: text/plain
            hint: the%20hint
            replying: true
            Content-Length: 23
            */
            case 'plain':
            {
                let output = '';
                const keys = Object.keys(this._headers);

                for (let i = 0; i < keys.length; ++i)
                {
                    const key = keys[i];

                    if (key === 'Content-Length')
                        continue;

                    const value = this._headers[key];
                    output += `${key}: ${value}\n`;
                }

                if (this._body)
                {
                    const bodyLen = Buffer.byteLength(this._body, 'utf8');
                    output += `${HeaderNames.ContentLength}: ${bodyLen}\n\n`;
                    output += this._body;
                }

                return output;
            }

            /*
            <event>
                <headers>
                <Event-Name>CUSTOM</Event-Name>
                <Core-UUID>8b192020-7368-4498-9b11-cbe10f48a784</Core-UUID>
                <FreeSWITCH-Hostname>smsdev</FreeSWITCH-Hostname>
                <FreeSWITCH-Switchname>smsdev</FreeSWITCH-Switchname>
                <FreeSWITCH-IPv4>10.1.12.115</FreeSWITCH-IPv4>
                <FreeSWITCH-IPv6>%3A%3A1</FreeSWITCH-IPv6>
                <Event-Date-Local>2012-09-25%2014%3A26%3A17</Event-Date-Local>
                <Event-Date-GMT>Tue,%2025%20Sep%202012%2018%3A26%3A17%20GMT</Event-Date-GMT>
                <Event-Date-Timestamp>1348597577616542</Event-Date-Timestamp>
                <Event-Calling-File>switch_cpp.cpp</Event-Calling-File>
                <Event-Calling-Function>Event</Event-Calling-Function>
                <Event-Calling-Line-Number>262</Event-Calling-Line-Number>
                <Event-Sequence>11057</Event-Sequence>
                <Event-Subclass>SMS%3A%3ASEND_MESSAGE</Event-Subclass>
                <proto>sip</proto>
                <dest_proto>sip</dest_proto>
                <from>9515529832</from>
                <from_full>9515529832</from_full>
                <to>internal/8507585138%40sms-proxy-01.bandwidthclec.com</to>
                <subject>PATLive%20Testing</subject>
                <type>text/plain</type>
                <hint>the%20hint</hint>
                <replying>true</replying>
                </headers>
                <Content-Length>23</Content-Length>
                <body>Hello from Chad Engler!</body>
            </event>
            */
            case 'xml':
            {
                let output = '';
                const keys = Object.keys(this._headers);

                output += '<event>\n';
                output += '    <headers>\n';

                for (let i = 0; i < keys.length; ++i)
                {
                    const key = keys[i];

                    if (key === 'Content-Length')
                        continue;

                    const value = this._headers[key];
                    const encodedValue = typeof value === 'string' ? encodeXml(value) : value;
                    output += `        <${key}>${encodedValue}</${key}>\n`;
                }

                if (this._body)
                {
                    const xmlEncodedBody = encodeXml(this._body);
                    const key = HeaderNames.ContentLength;
                    const value = Buffer.byteLength(xmlEncodedBody, 'utf8');
                    output += `        <${key}>${value}</${key}>\n`;
                    output += '    </headers>\n';
                    output += `    <body>${xmlEncodedBody}</body>\n`;
                }
                else
                {
                    output += '    </headers>\n';
                }

                output += '</event>';

                return output;
            }
        }

        return '';
    }

    /**
     * Sets the priority of an event to `priority` in case it's fired.
     */
    setPriority(priority: number): void
    {
        this.addHeader('priority', priority.toString());
    }

    /**
     * Gets the header with the key of `name` from the event object.
     */
    getHeader(name: string): string | null
    {
        return this._headers[name] || null;
    }

    /**
     * Gets the body of the event object.
     */
    getBody(): string
    {
        return this._body;
    }

    /**
     * Gets the event type of the event object.
     */
    getType(): string
    {
        return this._type;
    }

    /**
     * Add `value` to the body of the event object.
     * This can be called multiple times for the same event object.
     *
     * @returns the new body after appending `value`.
     */
    addBody(value: string): string
    {
        return this._body += value;
    }

    /**
     * Add a header with `name` and `value` to the event object.
     * This can be called multiple times
     * for the same event object.
     */
    addHeader(name: string, value: string): void
    {
        this._headers[name] = value;
    }

    /**
     * Delete the header with key `name` from the event object.
     */
    delHeader(name: string): void
    {
        delete this._headers[name];
    }

    /**
     * Sets the pointer to the first header in the event object,
     * and returns it's key name. This must be called before nextHeader is called.
     *
     * If there are no headers, then it will return `null`.
     */
    firstHeader(): string | null
    {
        this._headerIndex = 0;

        const keys = Object.keys(this._headers);

        if (keys.length === 0)
            return null;

        return keys[0];
    }

    /**
     * Moves the pointer to the next header in the event object,
     * and returns it's key name. `firstHeader` must be called
     * before this method to set the pointer. If you're already
     * on the last header when this method is called, then it will return `null`.
     */
    nextHeader(): string | null
    {
        // if no firstHeader called yet
        if (this._headerIndex === -1)
            return null;

        const keys = Object.keys(this._headers);

        // if reached end
        if (this._headerIndex === (keys.length - 1))
        {
            this._headerIndex = -1;
            return null;
        }

        ++this._headerIndex;

        return keys[this._headerIndex];
    }
}
