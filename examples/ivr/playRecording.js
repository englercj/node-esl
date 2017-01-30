// play ivr menu

// if you are looking for more examples recordings, please look under:
// /usr/share/freeswitch/sounds/en/us/callie
// in the vanilla Freeswitch install
// there are a lot of useful recordings

const ivrMenu = (conn) => {
  try {
    conn.execute('playback', './recordings/transfer1.wav');
    conn.execute('playback', './recordings/ivr-or.wav');
    conn.execute('playback', './recordings/4.wav');
    conn.execute('playback', './recordings/vm-press.wav');
    conn.execute('playback', './recordings/ivr-the_billing_department.wav');
    conn.execute('playback', './recordings/ivr-for.wav');
    conn.execute('playback', './recordings/3.wav');
    conn.execute('playback', './recordings/vm-press.wav');
    conn.execute('playback', './recordings/ivr-technical_support.wav');
    conn.execute('playback', './recordings/ivr-for.wav');
    conn.execute('playback', './recordings/2.wav');
    conn.execute('playback', './recordings/vm-press.wav');
    conn.execute('playback', './recordings/ivr-sales.wav');
    conn.execute('playback', './recordings/ivr-for.wav');
    conn.execute('playback', './recordings/ivr-welcome.wav');
  } catch (err) {
    console.log(err);
  } // catch
}; // ivr

module.exports.ivrMenu = ivrMenu;
