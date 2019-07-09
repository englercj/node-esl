import { Event } from './esl/Event';

let _log = false;
let _level = 0;

/**
 * Calling this function within your program causes your program to
 * issue informative messages related to the Event Socket Library
 * on STDOUT. `level` is an integer between 0 and 7. The values for `level` mean:
 *
 * - 0 is EMERG
 * - 1 is ALERT
 * - 2 is CRIT
 * - 3 is ERROR
 * - 4 is WARNING
 * - 5 is NOTICE
 * - 6 is INFO
 * - 7 is DEBUG
 *
 * Messages that have a lower value than `level` will be output on STDOUT, so higher
 * values of `level` will cause the Library to log more information. Once this
 * function is called, you can reduce the amount of log messages by calling this
 * function again with a `level` of 0, but it cannot be completely turned off.
 */
export function setLogLevel(level: number)
{
    _log = true;
    _level = level;
}

/**
 * @alias setLogLevel
 */
export function eslSetLogLevel(level: number)
{
    setLogLevel(level);
}

/**
 * Logs a logevent from FSW to stdout.
 */
export function log(event: Event)
{
    const logLevelStr = event.getHeader('Log-Level') || '7';
    const logLevel = parseInt(logLevelStr, 10);

    if (!_log || logLevel > _level)
        return;

    let msg = '';

    if (_level === 7)
    {
        msg += event.serialize();
        msg += '\n\n';
    }

    msg += event.getBody();

    console.log(msg);
}
