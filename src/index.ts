/**
 * ESL Object
 * @see https://freeswitch.org/confluence/display/FREESWITCH/Event+Socket+Library#EventSocketLibrary-ESLObject
 */
export { Connection, ExecuteArg, IEventCallback } from './esl/Connection';
export { Event } from './esl/Event';
export { Parser } from './esl/Parser';
export { Server } from './esl/Server';

import { logger } from './logger';

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
export function setLogLevel(level: number): void
{
    logger.setLogLevel(level);
}

/**
 * @alias setLogLevel
 */
export const eslSetLogLevel = setLogLevel;
