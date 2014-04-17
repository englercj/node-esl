var esl = module.exports = require('./esl/esl');

//
// ESLevent Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLevent_Object
//

esl.Event = require('./esl/Event');

//
// ESLconnection Object
// http://wiki.freeswitch.org/wiki/Event_Socket_Library#ESLconnection_Object
//

esl.Connection = require('./esl/Connection');

//
// ESLserver Object
// Custom object to manage multiple "Outbound" connections from FreeSWITCH
//

esl.Server = require('./esl/Server');

//
// ESLparser Object
// Custom object to parse ESL data into an ESLevent
//

esl.Parser = require('./esl/Parser');
