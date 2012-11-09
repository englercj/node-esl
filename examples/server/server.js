var esl = require('modesl');

var esl_server = new esl.Server({port: 8085, myevents:true}, function(){
    console.log("esl server is up");
});

esl_server.on('connection::ready', function(conn, id) {
    console.log('new call ' + id);
    conn.call_start = new Date().getTime();

    conn.execute('answer');
    conn.execute('echo', function(){
        console.log('echoing');
    });

    conn.on('esl::end', function(evt, body) {
        this.call_end = new Date().getTime();
        var delta = (this.call_end - this.call_start) / 1000;
        console.log("Call duration " + delta + " seconds");
    });
});
