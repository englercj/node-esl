const callDispatch = require('./callDispatch');

const dtmfArray = [];

// function for starting DTMF capture
const startDTMF = (conn) => {
  try {
    // start_dtmf
    conn.execute('start_dtmf');
  } catch (error) {
    console.log(error);
  }
}; // startDTMF

// function for processing DTMF for extensions
const processDTMF = (conn, dtmfDigit) => {
  if (dtmfDigit === '#') {
    const ext = dtmfArray.join('');

    callDispatch.callExtension(conn, ext);

    // clear the dtmfArray after call is dispatched
    dtmfArray.splice(0, dtmfArray.length);
  } else {
    dtmfArray.push(dtmfDigit);
  }
}; // processDTMF

// function for capturing DTMF from ESL event
const captureDTMF = (conn) => {
  conn.on('esl::event::DTMF::*', (evt) => {
    const dtmfDigit = evt.getHeader('DTMF-Digit');

    /*
    Using fallthrough in the switch statement to allow
    extension dialing where an extension ends with 2,3, or 4.
    */

    /* eslint no-fallthrough: "error" */

    switch (dtmfDigit) {
      case '2':
        if (dtmfArray.length === 0) {
          callDispatch.callGroup(conn, 'sales');

          // clear the dtmfArray after call is dispatched
          dtmfArray.splice(0, dtmfArray.length);

          break;
        }

      /* eslint no-fallthrough: "error" */

      case '3':
        if (dtmfArray.length === 0) {
          callDispatch.callGroup(conn, 'support');

          // clear the dtmfArray after call is dispatched
          dtmfArray.splice(0, dtmfArray.length);

          break;
        }

      /* eslint no-fallthrough: "error" */

      case '4':
        if (dtmfArray.length === 0) {
          callDispatch.callGroup(conn, 'billing');

          // clear the dtmfArray after call is dispatched
          dtmfArray.splice(0, dtmfArray.length);

          break;
        }

      /* eslint no-fallthrough: "error" */

      default:

        // caller did not enter 2,3, or 4 on first DTMF entry
        // we will process the dtmf as a call to an extension

        processDTMF(conn, dtmfDigit);

        break;
    }
  });
}; // captureDTMF

module.exports.startDTMF = startDTMF;
module.exports.captureDTMF = captureDTMF;
