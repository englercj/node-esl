#!/usr/bin/env node

var esl = require('modesl'),
//open a connection
conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {
    //send the status api command
    conn.api('status', function(res) {
        //log result body and exit
        console.log(res.getBody());
        process.exit(0);
    });
});