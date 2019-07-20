import { Event } from './esl/Event';

class Logger
{
    private _enabled = false;
    private _level = 0;
    private _logFunc = console.log;

    get enabled() { return this._enabled; }
    get level() { return this._level; }

    setLogFunction(logFunc: (msg: string) => void): void
    {
        this._logFunc = logFunc;
    }

    setLogLevel(level: number): number
    {
        this._enabled = true;
        this._level = level;

        return this._level;
    }

    log(event: Event): void
    {
        const logLevelStr = event.getHeader('Log-Level') || '7';
        const logLevel = parseInt(logLevelStr, 10);

        if (!this._enabled || logLevel > this._level)
            return;

        let msg = '';

        if (this._level === 7)
        {
            msg += event.serialize();
            msg += '\n\n';
        }

        msg += event.getBody();

        this._logFunc(msg);
    }
}

export const logger = new Logger();
