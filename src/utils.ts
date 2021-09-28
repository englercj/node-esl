export type ICallback<T> = (arg: T) => void;
export type IErrorCallback<T> = (err: Error| unknown | null, result?: T) => void;

export type IDictionary<T> = Partial<{ [key: string]: T }>;

export function encodeXml(str: string): string
{
    if (!str)
        return '';

    return str.replace(/([&"<>\'])/g, function (str, item)
    {
        switch (item)
        {
            case '>': return '&gt;';
            case '<': return '&lt;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            case '&': return '&amp;';
            default: return '';
        }
    });
}

export type IFormat = 'plain' | 'xml' | 'json';
export const VALID_FORMATS = ['plain', 'xml', 'json'];

export function isValidFormat(format: string): format is IFormat
{
    return VALID_FORMATS.indexOf(format) !== -1;
}
