const esl = require('modesl');
const dtmf = require('./dtmf');
const playRecording = require('./playRecording');

const eslServer = new esl.Server({ port: 8085, myevents: true }, () => {
  console.log('esl ivr server is up');
}); // esl_server

eslServer.on('connection::ready', (conn) => {
  dtmf.startDTMF(conn);
  playRecording.ivrMenu(conn);
  dtmf.captureDTMF(conn);
}); // eslServer.on
