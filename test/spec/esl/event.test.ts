import { expect } from 'chai';
import { eventJson, eventPlain, eventXml } from '../../fixtures/data';
import { Event } from '../../../src/esl/Event';

const heads = JSON.parse(eventJson);

describe('esl.Event', function ()
{
    it('should have the correct exports', function ()
    {
        //object level properties
        expect(Event).to.be.a('function');

        const evt = new Event({});

        // instance public functions
        expect(evt.serialize).to.be.a('function');
        expect(evt.setPriority).to.be.a('function');
        expect(evt.getHeader).to.be.a('function');
        expect(evt.getBody).to.be.a('function');
        expect(evt.getType).to.be.a('function');
        expect(evt.addBody).to.be.a('function');
        expect(evt.addHeader).to.be.a('function');
        expect(evt.delHeader).to.be.a('function');
        expect(evt.firstHeader).to.be.a('function');
        expect(evt.nextHeader).to.be.a('function');
    });

    describe('Constructor', function ()
    {
        it('should properly construct with ()', function ()
        {
            const e = new Event({});

            expect(e.getType()).to.equal('');
            expect(e.getHeader('Event-Name')).to.be.null;
            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (type)', function ()
        {
            const e = new Event(heads['Event-Name']);

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (type, subclass)', function ()
        {
            const e = new Event(heads['Event-Name'], heads['Event-Subclass']);

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);
            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers)', function ()
        {
            const e = new Event({ 'Event-Name': heads['Event-Name'], 'Reply-Text': '+OK' });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers [with Event-Subclass])', function ()
        {
            const e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                'Event-Subclass': heads['Event-Subclass']
            });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers [with _body])', function ()
        {
            const e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                '_body': 'some body here'
            });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getBody()).to.equal('some body here');
        });

        it('should properly construct with (headers, body)', function ()
        {
            const e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK'
            }, 'some body here');

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getBody()).to.equal('some body here');
        });

        it('should properly construct with (headers [with _body], body)', function ()
        {
            const e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                '_body': 'skip me'
            }, 'some body here');

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getHeader('_body')).to.be.null;
            expect(e.getBody()).to.equal('some body here');
        });
    });

    describe('esl.Event methods', function ()
    {
        let e: Event;

        beforeEach(function ()
        {
            e = new Event(Object.assign({}, heads));
        });

        describe('.serialize()', function ()
        {
            it('should serialize into json', function ()
            {
                expect(e.serialize('json')).to.equal(eventJson);
            });

            it('should serialize into plain', function ()
            {
                expect(e.serialize('plain')).to.equal(eventPlain);
            });

            it('should serialize into xml', function ()
            {
                expect(e.serialize('xml')).to.equal(eventXml);
            });
        });

        describe('.setPriority()', function ()
        {
            it('should set priority header', function ()
            {
                e.setPriority(3);

                expect(e.getHeader('priority')).to.equal('3');
            });
        });

        describe('.getHeader()', function ()
        {
            it('should return correct values', function ()
            {
                expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
                expect(e.getHeader('Core-UUID')).to.equal(heads['Core-UUID']);
                expect(e.getHeader('Event-Date-Timestamp')).to.equal(heads['Event-Date-Timestamp']);
            });
        });

        describe('.getBody()', function ()
        {
            it('should return current body', function ()
            {
                expect(e.getBody()).to.equal(heads._body);
            });
        });

        describe('.getType()', function ()
        {
            it('should return message name', function ()
            {
                expect(e.getType()).to.equal(heads['Event-Name']);
            });
        });

        describe('.addBody()', function ()
        {
            it('should append body', function ()
            {
                e.addBody('MOAR BODY');

                expect(e.getBody()).to.equal(heads._body + 'MOAR BODY');
            });
        });

        describe('.addHeader()', function ()
        {
            it('should add new headers', function ()
            {
                expect(e.getHeader('MyHeader')).to.be.null;
                e.addHeader('MyHeader', 'value');
                expect(e.getHeader('MyHeader')).to.equal('value');
            });

            it('should replace existing headers', function ()
            {
                expect(e.getHeader('subject')).to.equal('None');
                e.addHeader('subject', 'Some');
                expect(e.getHeader('subject')).to.equal('Some');
            });
        });

        describe('.delHeader()', function ()
        {
            it('should remove headers', function ()
            {
                expect(e.getHeader('subject')).to.equal('None');
                e.delHeader('subject');
                expect(e.getHeader('subject')).to.be.null;
                expect(e.delHeader.bind(e, 'subject')).to.not.throw(Error);
            });
        });

        describe('.firstHeader()', function ()
        {
            it('should move ptr to first header and return its key', function ()
            {
                expect((e as any)._headerIndex).to.equal(-1);

                const key = e.firstHeader();

                expect((e as any)._headerIndex).to.equal(0);
                expect(key).to.equal(Object.keys(e.headers)[0]);
            });
        });

        describe('.nextHeader()', function ()
        {
            it('should return null if no firstHeader() call yet', function ()
            {
                expect((e as any)._headerIndex).to.equal(-1);
                expect(e.nextHeader()).to.be.null;
            });

            it('should return null if at the end of Headers', function ()
            {
                const len = Object.keys(heads).length - 1; // don't count _body

                e.firstHeader();

                for (let i = 0; i <= len; ++i)
                {
                    e.nextHeader();
                }

                expect(e.nextHeader()).to.be.null;
            });

            it('should move ptr to next header and return its key', function ()
            {
                e.firstHeader();

                expect((e as any)._headerIndex).to.equal(0);

                const key = e.nextHeader();

                expect((e as any)._headerIndex).to.equal(1);
                expect(key).to.equal(Object.keys(e.headers)[1]);
            });
        });
    });
});
