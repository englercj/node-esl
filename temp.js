/*var esl = require('./lib/esl'),
conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {
    console.log('hey');
    conn.on('esl::event::**', function(evt) {
	console.log(evt);
    });
});*/

var esl = require('./lib/esl'),
eyes = require('eyes');
//console.log(esl);
/*conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {
    conn.subscribe(function() {
        conn.bgapi('status', null, 'my-job-id', function(e) {
            console.log(e.serialize());
        });
    });
        conn.bgapi('status', null, 'my-job-id-1', function(e) {
            console.log(e.serialize());
        });
        conn.bgapi('status', null, 'my-job-id-2', function(e) {
            console.log(e.serialize());
        });
        conn.bgapi('status', null, 'my-job-id-3', function(e) {
            console.log(e.serialize());
        });
});*/

//conn.on('esl::event::**', function(e) { console.log(e); });

var conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {
    conn.on('esl::event::**', function(e) {
        if(!e.getHeader('Event-Name') || e.getHeader('Event-Name').indexOf('CHANNEL') === -1) return;

        //eyes.inspect(JSON.parse(e.serialize('json')), 'Event: ' + e.getHeader('Event-Name'));
	console.log(JSON.parse(e.serialize('json')));
    });
    //conn.show('channels', function(err, data) {
    //console.log('Error:', err);
    //});
});