const XML_ESCAPE_MAP: {[char: string] : string} = {
    '>': '&gt;',
    '<': '&lt;',
    '\'': '&apos;',
    '"': '&quot;',
    '&': '&amp;'
};


export function encodeXml(valToEncode: string) {
    if (!valToEncode) return '';

    return valToEncode.replace(/([&"<>\'])/g, function (str, item: any) {
        return XML_ESCAPE_MAP[item] || item;
    });
}
