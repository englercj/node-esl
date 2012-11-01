var argv = require('optimist').options({
    help: {
        alias: 'h',
        describe: 'Usage Information',
        'boolean': true
    },
    host: {
        alias: 'H',
        describe: 'Host to connect',
        string: true,
        'default': '127.0.0.1'
    },
    port: {
        alias: 'P',
        describe: 'Port to connect (1 - 65535)',
        'default': 8021
    },
    user: {
        alias: 'u',
        describe: 'user@domain',
        string: true
    },
    password: {
        alias: 'p',
        describe: 'Password',
        string: true,
        'default': 'ClueCon'
    },
    interrupt: {
        alias: 'i',
        describe: 'Allow Control-C to interrupt',
        'boolean': true
    },
    execute: {
        alias: 'x',
        describe: 'Execute COmmand and Exit',
        string: true
    },
    loglevel: {
        alias: 'l',
        describe: 'Log Level',
        'default': 'debug'
    },
    quiet: {
        alias: 'q',
        descibe: 'Disable logging',
        'boolean': true
    },
    retry: {
        alias: 'r',
        describe: 'Retry connection on failure',
        'boolean': true
    },
    reconnect: {
        alias: 'R',
        describe: 'Reconnect if disconnected',
        'boolean': true
    },
    debug: {
        alias: 'd',
        describe: 'Debug Level (0 - 7)',
        'default': 6
    },
    batchmode: {
        alias: 'b',
        describe: 'Batch mode',
        'boolean': true
    },
    timeout: {
        alias: 't',
        describe: 'Timeout for API commands (in miliseconds)',
        'default': 1000
    }
})
    .usage('Usage: $0 [-H <host>] [-P <port>] [-p <secret>] [-d <level>] [-x command] [-t <timeout_ms>]')
    .argv;

//parse argv
exports.parse = function() {
    //show help and exit
    if(argv.help) {
        argv.showHelp(console.log);
        setTimeout(function() { process.exit(0); }, 200);
    }

    //return argv
    return argv;
};