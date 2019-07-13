import { expect } from 'chai';
import { encodeXml, isValidFormat } from '../../src/utils';

describe('Utils', function ()
{
    describe('encodeXml()', function ()
    {
        it('Returns empty string on empty string input', function ()
        {
            expect(encodeXml('')).to.equal('');
        });

        it('Escape braces', function ()
        {
            expect(encodeXml('<hello>')).to.equal('&lt;hello&gt;');
        });

        it('Escapes quotes', function ()
        {
            expect(encodeXml('"hello"')).to.equal('&quot;hello&quot;');
            expect(encodeXml('\'hello\'')).to.equal('&apos;hello&apos;');
        });

        it('Escapes ampersands', function ()
        {
            expect(encodeXml('&hello&')).to.equal('&amp;hello&amp;');
        });

        it('Escapes an XML string with special characters', function ()
        {
            expect(encodeXml('<tag>Hello Chad\'s "cat" & "dog"</tag>'))
                .to.equal('&lt;tag&gt;Hello Chad&apos;s &quot;cat&quot; &amp; &quot;dog&quot;&lt;/tag&gt;');
        });
    });

    describe('isValidFormat()', function ()
    {
        it('Returns true for "plain", "xml", and "json"', function ()
        {
            expect(isValidFormat('plain')).to.equal(true);
            expect(isValidFormat('xml')).to.equal(true);
            expect(isValidFormat('json')).to.equal(true);
        });

        it('Returns false for any other string', function ()
        {
            expect(isValidFormat('string')).to.equal(false);
            expect(isValidFormat('case')).to.equal(false);
            expect(isValidFormat('normal')).to.equal(false);
            expect(isValidFormat('etc')).to.equal(false);
        });
    });
});
