var data = require('../../fixtures/data'),
    heads = JSON.parse(data.event.json),
    encodeXml = require('../../../lib/util/xml').encodeXml,
    Event = require('../../../lib/esl/Event');

describe('esl.Event', function() {
    it('should have the correct exports', function() {
        //object level properties
        expect(Event).to.be.a('function');
        expect(Event.PRIORITY).to.be.a('object');
        expect(Event.PRIORITY.LOW).to.equal('LOW');
        expect(Event.PRIORITY.NORMAL).to.equal('NORMAL');
        expect(Event.PRIORITY.HIGH).to.equal('HIGH');

        var evt = new Event();

        //instance public functions
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

        //instance private functions
        expect(evt._findHeaderIndex).to.be.a('function');
        expect(evt._findHeader).to.be.a('function');

        //instance variables
        expect(evt.headers).to.be.an.instanceOf(Array);
        expect(evt.hPtr).to.be.null;
        expect(evt.type).to.be.a('string');
        expect(evt.body).to.be.a('string');
    });

    describe('Constructor', function() {
        it('should properly construct with ()', function() {
            var e = new Event();

            expect(e.getType()).to.equal('');
            expect(e.type).to.equal('');

            expect(e.getHeader('Event-Name')).to.be.null;

            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (type)', function() {
            var e = new Event(heads['Event-Name']);

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);

            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (type, subclass)', function() {
            var e = new Event(heads['Event-Name'], heads['Event-Subclass']);

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);

            expect(e.subclass).to.equal(heads['Event-Subclass']);
            expect(e.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);

            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers)', function() {
            var e = new Event({ 'Event-Name': heads['Event-Name'], 'Reply-Text': '+OK' });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);

            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');

            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers [with Event-Subclass])', function() {
            var e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                'Event-Subclass': heads['Event-Subclass']
            });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);
            expect(e.subclass).to.equal(heads['Event-Subclass']);

            expect(e.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);
            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');

            expect(e.getBody()).to.equal('');
        });

        it('should properly construct with (headers [with _body])', function() {
            var e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                '_body': 'some body here'
            });

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);

            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');

            expect(e.getBody()).to.equal('some body here');
        });

        it('should properly construct with (headers, body)', function() {
            var e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK'
            }, 'some body here');

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);

            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');

            expect(e.getBody()).to.equal('some body here');
        });

        it('should properly construct with (headers [with _body], body)', function() {
            var e = new Event({
                'Event-Name': heads['Event-Name'],
                'Reply-Text': '+OK',
                '_body': 'skip me'
            }, 'some body here');

            expect(e.getType()).to.equal(heads['Event-Name']);
            expect(e.type).to.equal(heads['Event-Name']);

            expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
            expect(e.getHeader('Reply-Text')).to.equal('+OK');
            expect(e.getHeader('_body')).to.be.null;

            expect(e.getBody()).to.equal('some body here');
        });
    });

    describe('esl.Event methods', function() {
        var e = null;

        beforeEach(function() {
            e = new Event(heads);
        });

        describe('.serialize()', function() {
            it('should serialize into json', function() {
                expect(e.serialize('json')).to.equal(data.event.json);

                expect(Buffer.byteLength(e.body)).to.equal(e.getHeader('Content-Length'));
            });

            it('should serialize into plain', function() {
                expect(e.serialize('plain')).to.equal(data.event.plain);
                expect(e.serialize('plain')).to.equal(e.serialize());

                expect(Buffer.byteLength(e.body)).to.equal(e.getHeader('Content-Length'));
            });

            it('should serialize into xml', function() {
                expect(e.serialize('xml')).to.equal(data.event.xml);

                var xmlBody = typeof e.body === 'string' ? encodeXml(e.body) : e.body;
                expect(Buffer.byteLength(xmlBody)).to.equal(e.getHeader('Content-Length'));
            });
        });

        describe('.setPriority()', function() {
            it('should set priority header', function() {
                e.setPriority(Event.PRIORITY.HIGH);

                expect(e.getHeader('priority')).to.equal(Event.PRIORITY.HIGH);
            });
        });

        describe('.getHeader()', function() {
            it('should return correct values', function() {
                expect(e.getHeader('Event-Name')).to.equal(heads['Event-Name']);
                expect(e.getHeader('Core-UUID')).to.equal(heads['Core-UUID']);
                expect(e.getHeader('Event-Date-Timestamp')).to.equal(heads['Event-Date-Timestamp']);
            });
        });

        describe('.getBody()', function() {
            it('should return current body', function() {
                expect(e.getBody()).to.equal(heads._body);
            });
        });

        describe('.getType()', function() {
            it('should return message name', function() {
                expect(e.getType()).to.equal(heads['Event-Name']);
            });
        });

        describe('.addBody()', function() {
            it('should append body', function() {
                e.addBody('MOAR BODY');

                expect(e.getBody()).to.equal(heads._body + 'MOAR BODY');
            });
        });

        describe('.addHeader()', function() {
            it('should add new headers', function() {
                expect(e.getHeader('MyHeader')).to.be.null;

                e.addHeader('MyHeader', 'value');

                expect(e.getHeader('MyHeader')).to.equal('value');
            });

            it('should replace existing headers', function() {
                expect(e.getHeader('subject')).to.equal('None');

                e.addHeader('subject', 'Some');

                expect(e.getHeader('subject')).to.equal('Some');
            });
        });

        describe('.delHeader()', function() {
            it('should remove headers', function() {
                expect(e.getHeader('subject')).to.equal('None');

                e.delHeader('subject');

                expect(e.getHeader('subject')).to.be.null;
                expect(e.delHeader.bind(e, 'subject')).to.not.throw(Error);
            });
        });

        describe('.firstHeader()', function() {
            it('should move ptr to first header and return its key', function() {
                expect(e.hPtr).to.be.null;

                var key = e.firstHeader();

                expect(e.hPtr).to.equal(0);
                expect(key).to.equal(e.headers[0].name);
            });
        });

        describe('.nextHeader()', function() {
            it('should return null if no firstHeader() call yet', function() {
                expect(e.hPtr).to.be.null;
                expect(e.nextHeader()).to.be.null;
            });

            it('should return null if at the end of Headers', function() {
                var len = Object.keys(heads).length - 1; //dont count _body

                //init ptr
                e.firstHeader();

                //go through each header
                for(var i = 0; i <= len; ++i) {
                    e.nextHeader();
                }

                //should now be at end
                expect(e.nextHeader()).to.be.null;
            });

            it('should move ptr to next header and return its key', function() {
                //must call firstHeader before using nextHeader
                e.firstHeader();

                expect(e.hPtr).to.equal(0);

                var key = e.nextHeader();

                expect(e.hPtr).to.equal(1);
                expect(key).to.equal(e.headers[1].name);
            });
        });
    });
});
