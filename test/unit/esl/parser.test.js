var data = require('../../fixtures/data'),
    heads = JSON.parse(data.event.json),
    macros = require('../../fixtures/macros'),
    Parser = require('../../../lib/esl/Parser'),
    parser, socket;

describe('esl.Parser', function() {
    var serverSocket;

    before(function(done) {
        macros.getEchoServerSocket(function(err, client, server) {
            if(err) return done(err);

            socket = client;
            serverSocket = server;
            parser = new Parser(client);
            done();
        });
    });

    it('should have the correct exports', function() {
        expect(Parser).to.be.a('function');
    });

    describe('normal events', describeEvents(data.stream.normal));
    describe('plain events', describeEvents(data.stream.plain));
    describe('json events', describeEvents(data.stream.json));
    describe('xml events', describeEvents(data.stream.xml));

    describe('normal events doubled', describeEvents(data.stream.normal + data.stream.normal));
    describe('plain events doubled', describeEvents(data.stream.plain + data.stream.plain));
    describe('json events doubled', describeEvents(data.stream.json + data.stream.json));
    describe('xml events doubled', describeEvents(data.stream.xml + data.stream.xml));

    after(function() {
        socket.end();
        serverSocket.close();
    });
});

function describeEvents(streamData) {
    return function() {
        it('should parse an event given all at once', function(done) {
            parser.once('esl::event', testParserEvent.bind(null, done));

            socket.write(streamData);
        });

        it('should parse an event given one line at a time', function(done) {
            parser.once('esl::event', testParserEvent.bind(null, done));

            //make socket get only 1 line at a time, to test the parser
            //gleaning only parts at a time
            (function writeSocketLinesAsync(socket, lns, i) {
                if(i === lns.length) return;

                socket.write(lns[i] + '\n');

                process.nextTick(function() {
                    writeSocketLinesAsync(socket, lns, ++i);
                });
            })(socket, streamData.split('\n'), 0);
        });
    };
}

function testParserEvent(done, evt) {
    //event name
    expect(evt.getType()).to.equal(heads['Event-Name']);
    expect(evt.type).to.equal(heads['Event-Name']);
    expect(evt.getHeader('Event-Name')).to.equal(heads['Event-Name']);

    //subclass
    expect(evt.getHeader('Event-Subclass')).to.equal(heads['Event-Subclass']);

    //body
    expect(evt.getBody()).to.equal(heads._body);

    //content type
    if(!heads['Content-Type'])
        expect(evt.getHeader('Content-Type')).to.be.null;
    else
        expect(evt.getHeader('Content-Type')).to.equal(heads['Content-Type']);

    done();
}
