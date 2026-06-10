/**
 * Regression tests for S-10: JSON-LD serialized into <script> tags must
 * escape '<' so content can never close the script element early.
 */
import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '@/lib/json-ld';

describe('serializeJsonLd (S-10)', () => {
    it('S-10 regression guard: a value containing </script> cannot close the script element', () => {
        const out = serializeJsonLd({
            headline: 'Evil title </script><script>alert(1)</script>',
        });
        expect(out).not.toContain('</script');
        expect(out).not.toContain('<script');
        expect(out).toContain('\\u003c/script');
    });

    it('escapes every < including nested structures and arrays', () => {
        const out = serializeJsonLd({
            a: ['<b>', { c: 'x < y' }],
        });
        expect(out).not.toContain('<');
    });

    it('round-trips: escaped output parses back to the original data', () => {
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'A title with </script> and <tags> & "quotes"',
            nested: { items: ['<one>', 2, true, null] },
        };
        expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
    });

    it('leaves content without < untouched (byte-identical to JSON.stringify)', () => {
        const data = { '@type': 'BreadcrumbList', position: 1, name: 'Blog' };
        expect(serializeJsonLd(data)).toBe(JSON.stringify(data));
    });
});
