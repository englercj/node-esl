// play ivr menu
const ivrMenu = (conn) => {
  try {
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/misc/48000/transfer1.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-or.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/digits/48000/4.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/voicemail/48000/vm-press.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-the_billing_department.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-for.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/digits/48000/3.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/voicemail/48000/vm-press.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-technical_support.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-for.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/digits/48000/2.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/voicemail/48000/vm-press.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-sales.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-for.wav');
    conn.execute('playback', '/usr/share/freeswitch/sounds/en/us/callie/ivr/48000/ivr-welcome.wav');
  } catch (err) {
    console.log(err);
  } // catch
}; // ivr

module.exports.ivrMenu = ivrMenu;
