// function to call groups
const callGroup = (conn, group) => {
  try {
    conn.execute('bridge', `\${group_call(${group}@\${domain_name})}`);
  } catch (err) {
    console.log(err);
  }
}; // groupCall

// function to call an extension
const callExtension = (conn, ext) => {
  try {
    conn.execute('bridge', `sofia/internal/${ext}%\${sip_profile}`);
  } catch (err) {
    console.log(err);
  }
}; // callExtension

module.exports.callGroup = callGroup;
module.exports.callExtension = callExtension;
