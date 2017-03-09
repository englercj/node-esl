var XML_ESCAPE_MAP = {
    '>': '&gt;',
    '<': '&lt;',
    '\'': '&apos;',
    '"': '&quot;',
    '&': '&amp;'
};

module.exports = {
    encodeXml: function _encodeXml(string) {
        if (!string) return '';

        return string.replace(/([&"<>\'])/g, function(str, item) {
            return XML_ESCAPE_MAP[item];
        });
    }
};
