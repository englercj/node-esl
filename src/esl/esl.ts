//
// ESL Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESL_Object
//
//Calling this function within your program causes your program to
// issue informative messages related to the Event Socket Library
// on STDOUT. $loglevel is an integer between 0 and 7. The values for $loglevel mean:
//
//0 is EMERG
//1 is ALERT
//2 is CRIT
//3 is ERROR
//4 is WARNING
//5 is NOTICE
//6 is INFO
//7 is DEBUG
//
//Messages that have a lower value than $loglevel will be output on STDOUT, so higher
// values of $loglevel will cause the Library to log more information. Once this
// function is called, you can reduce the amount of log messages by calling this
// function again with a $loglevel of 0, but it cannot be completely turned off.
//
//eslSetLogLevel is implemented as class-level method, as opposed to an
// instance-level method, so you do not need to create a new instance of the
// class to call this method.

//called by a connection object on log/data events

export class Esl {

    _log: boolean;
    _level: number;
    _logger: Console;

    constructor() {
        this._log = false;
        this._level = 0;
    }

    setLogLevel(level: number) {
        this._log = true;

        this._level = level;
    }

    _logMessage(msg: string) {
        console.log(msg);
    }

    _doLog(evt: any) {
        if (!this._log || evt.getHeader('Log-Level') > this._level) return;

        var msg = '';

        if (this._level === 7) {
            msg += evt.serialize();
            msg += '\n\n';
        }

        msg += evt.getBody();

        this._logMessage(msg);
    }
}

export const esl = new Esl();