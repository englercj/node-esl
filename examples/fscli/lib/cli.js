var readline = require('readline'),
director = require('director'),
esl = require('modesl');

var Cli = exports.Cli = function(args, rdyCb) {
    this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: this._completer.bind(this)
    });

    this.router = new director.cli.Router().configure({ notfound: this._onNotFound.bind(this) });
    var conn = this.conn = new esl.Connection(args.host, args.port, args.password, function(evt) {
        //subscribe to all events
        conn.subscribe(function() {
            if(rdyCb) rdyCb(evt);
        });
    });

    for(var i = 0, len = Cli.commands.length; i < len; ++i) {
        var cmd = Cli.commands[i];

        this.router.on(cmd[1], this[cmd[0].replace('/', 'slash_')].bind(this));
    }

    this.rl.setPrompt('$> ', 3);

    this.rl.on('line', this._onLine.bind(this));
    this.rl.on('close', this._onClose.bind(this));
    this.rl.on('SIGINT', this._onInt.bind(this));
    this.rl.on('SIGCONT', this._onCont.bind(this));

    this.conn.on('esl::event::command::reply', this._onEvent.bind(this));
    this.conn.on('esl::event::api::response', this._onEvent.bind(this));
    //this.conn.on('esl::event::**', this._onEvent.bind(this));
};

Cli.prototype.start = function() {
    this.rl.prompt();
};

//['/cmd', '/cmd :arg :arg']
Cli.commands = [
    ['/quit', '/quit'],         //quit the app
    ['/bye', '/bye'],           //quit the app
    ['/exit', '/exit'],         //quit the app
    ['/event', /\/event (\w+) (.+)/],       //enable events
    ['/noevents', '/noevents'], //disable all events previously enabled by /event
    ['/nixevent', /\/nixevent (.+)/],  //Enable all but one type of event
    //['/log', '/log :level'],           //set the loglevel of FreeSWITCH
    //['/nolog', '/nolog'],       //disable logging
    ['/uuid', '/uuid :uuid'],         //filter logs for a single call uuid
    //['/filter', '/filter'],
    ['/help', '/help'],     //display all fscli commands
    ['event', /event (\w+) (.+)/],
    ['api', /api (\w+) ?(\w+)?/],
    ['bgapi', /bgapi (\w+) ?(\w+)?/]
];

//Command handlers:
//-------------------
Cli.prototype.slash_quit = Cli.prototype.slash_bye = Cli.prototype.slash_exit = function() {
    this.rl.close();
};

Cli.prototype.slash_event = Cli.prototype.event = function(format, events) {
    this.conn.events(format, events);
};

Cli.prototype.slash_noevents = function() {
    this.conn.send('noevents');
};

Cli.prototype.slash_nixevent = function(events) {
    this.conn.send('nixevent ' + events);
};

Cli.prototype.slash_log = function(level) {
    this.conn.send('log ' + level);
};

Cli.prototype.slash_nolog = function() {
    this.conn.send('nolog');
};

Cli.prototype.slash_uuid = function(uuid) {
    this.conn.send('myevents ' + uuid);
};

Cli.prototype.slash_filter = function() {};

Cli.prototype.slash_help = function() {
    //display help
    console.log('Commands:');
    for(var i = 0, len = Cli.commands.length; i < len; ++i) {
        console.log(Cli.commands[i][0]);
    }
    this.rl.prompt();
};

Cli.prototype.api = function(cmd, arg) {
    this.conn.api(cmd, arg);
};

Cli.prototype.bgapi = function(cmd, arg) {
    this.conn.bgapi(cmd, arg, this._onEvent.bind(this));
};
//-------------------

Cli.prototype._onEvent = function(evt) {
    var txt = evt.getHeader('Reply-Text') || evt.getBody(),
    job = evt.getHeader('Job-UUID');

    if(txt.indexOf('Job-UUID') !== -1) {
        txt += ': ' + evt.getHeader('Job-UUID');
    }

    if(txt) {
        console.log(txt);
        this.rl.prompt();
    }
};

//Dispatch router when we get a line
Cli.prototype._onLine = function(line) {
    line = line.trim();

    if(line)
        this.router.dispatch('on', line.trim());
    else
        this.rl.prompt();
};

Cli.prototype._onNotFound = function() {
    console.log('Command not found!');
    this.rl.prompt();
};

//on readline close
Cli.prototype._onClose = function() {
    console.log('Good bye!');
    process.exit(0);
};

//on SIGINT (Control-C)
Cli.prototype._onInt = function() {
    console.log('Type /exit or /quit or /bye to exit.');
    this.rl.prompt();
};

//on SIGCONT (return from background)
Cli.prototype._onCont = function() {
    this.rl.prompt();
};

//on complete (Tab)
Cli.prototype._completer = function(line) {
    var completions = Cli.commands,
    hits = completions.filter(function(c) {
        return c[0].indexOf(line) === 0;
    });

    //returns [[matching, entries], originalSubstring]
    return [hits.length ? hits : completions, line]
};