var esl = module.exports = {};

//
// ESL Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESL_Object
//

esl._log = false;
esl._level = 0;

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
esl.setLogLevel = esl.eslSetLogLevel = function(level) {
    esl._log = true;

    if(typeof level === 'number')
	esl._level = level;
};

//
// ESLevent Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLevent_Object
//

esl.Event = require('./esl/event').Event;

//
// ESLconnection Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLconnection_Object
//

esl.Connection = require('./esl/connection').Connection;

//
// ESLserver Object
// Custom object to manage multiple "Outbound" connections from FreeSWITCH
//

esl.Server = require('./esl/server').Server;

//
// ESLparser Object
// Custom object to parse ESL data into an ESLevent
//

esl.Parser = require('./esl/parser').Parser;