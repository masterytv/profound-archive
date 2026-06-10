/**
 * Characterization tests for the zero-dependency markdown renderer.
 *
 * These capture CURRENT behavior — including known gaps documented in
 * docs/IMPROVEMENT_PLAN.md (finding S-6: URL schemes are not validated).
 * When S-6 is fixed, the tests marked "documents S-6" are EXPECTED to be
 * updated to assert the new, safe behavior.
 */
import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '@/lib/markdown';

describe('markdownToHtml — sanitization (current behavior)', () => {
    it('strips <script> tags and their content', () => {
        const out = markdownToHtml('hello <script>alert(1)</script> world');
        expect(out).not.toContain('<script');
        expect(out).not.toContain('alert(1)');
    });

    it('strips dangerous tags (iframe, form, input)', () => {
        const out = markdownToHtml('<iframe src="x"></iframe><form><input /></form>');
        expect(out).not.toContain('<iframe');
        expect(out).not.toContain('<form');
        expect(out).not.toContain('<input');
    });

    it('strips inline event handler attributes', () => {
        const out = markdownToHtml('<div onclick="evil()">hi</div> <img src="x" onerror="evil()">');
        expect(out).not.toContain('onclick');
        expect(out).not.toContain('onerror');
    });

    it('S-6 regression guard: javascript: links are neutralized to href="#" but keep their text', () => {
        const truncated = markdownToHtml('[click me](javascript:alert(1))');
        expect(truncated).not.toContain('javascript:');
        expect(truncated).toContain('href="#"');
        expect(truncated).toContain('click me');

        const intact = markdownToHtml('[click me](javascript:window.location=document.cookie)');
        expect(intact).not.toContain('javascript:');
        expect(intact).toContain('href="#"');
    });

    it('S-6 regression guard: disallowed schemes and smuggled variants are all neutralized', () => {
        for (const url of [
            'javascript:alert`1`',
            'JaVaScRiPt:alert`1`',
            'java\nscript:alert`1`',
            'java\tscript:alert`1`',
            'data:text/html,<script>alert(1)</script>',
            'vbscript:msgbox',
            '//evil.example.com/x',
            // Browsers normalize '\' to '/' in URLs, so these are protocol-relative.
            '/\\evil.example.com/x',
            '/\\\\evil.example.com/x',
        ]) {
            const out = markdownToHtml(`[text](${url})`);
            // Either the link is neutralized to href="#" or it doesn't parse as
            // a link at all — but no real href may ever be produced from these.
            expect(out, `URL should be neutralized: ${JSON.stringify(url)}`).not.toMatch(/href="(?!#")/);
            expect(out, `no executable scheme may survive: ${JSON.stringify(url)}`).not.toMatch(/(?:href|src)="(?:javascript|data|vbscript)/i);
        }
    });

    it('S-6 regression guard: javascript: image srcs are dropped, keeping alt as plain text', () => {
        const out = markdownToHtml('![alt text](javascript:window.location=document.cookie)');
        expect(out).not.toContain('javascript:');
        expect(out).not.toContain('<img');
        expect(out).toContain('alt text');
    });

    it('S-6 regression guard: quotes in URLs cannot break out of the href attribute', () => {
        const out = markdownToHtml('[x](https://example.com/"style="position:fixed)');
        expect(out).not.toMatch(/style="/);
        expect(out).toContain('&quot;');
    });

    it('S-6 follow-up: an unclosed link construct must not swallow paragraphs into the href', () => {
        // Reproduces the staging blog breakage: AI-generated bodies sometimes
        // contain `[text](url` with no closing paren. The URL capture must stop
        // at whitespace so the construct degrades to literal text instead of
        // shredding the document into a giant escaped href.
        const md = [
            '[One account on Project Profound](/video puts it bluntly: "No judgment."',
            '',
            '## What Actually Gets Reviewed',
            '',
            'More text follows here (with parentheses).',
        ].join('\n');
        const out = markdownToHtml(md);
        // The real heading renders as markup, never as escaped text.
        expect(out).toContain('<h2 class="text-2xl font-bold mt-10 mb-4">What Actually Gets Reviewed</h2>');
        expect(out).not.toContain('&lt;h2');
        // The malformed construct stays as bounded literal text; no link is produced from it.
        expect(out).toContain('[One account on Project Profound](/video puts it bluntly:');
        expect(out).not.toMatch(/<a[^>]*href="[^"]*video puts/);
    });

    it('S-6 follow-up: link text cannot span multiple lines', () => {
        const out = markdownToHtml('[line one\nline two](https://example.com)');
        expect(out).not.toContain('<a ');
    });

    it('S-6: allowed URL forms still render as real links/images', () => {
        expect(markdownToHtml('[a](https://example.com/page)')).toContain('href="https://example.com/page"');
        expect(markdownToHtml('[a](http://example.com)')).toContain('href="http://example.com"');
        expect(markdownToHtml('[a](mailto:hi@example.com)')).toContain('href="mailto:hi@example.com"');
        expect(markdownToHtml('[a](/blog/post)')).toContain('href="/blog/post"');
        expect(markdownToHtml('![pic](https://example.com/i.png)')).toContain('src="https://example.com/i.png"');
    });
});

describe('markdownToHtml — rendering (current behavior)', () => {
    it('returns empty string for empty/falsy input', () => {
        expect(markdownToHtml('')).toBe('');
    });

    it('renders headings h1–h4', () => {
        const out = markdownToHtml('# One\n\n## Two\n\n### Three\n\n#### Four');
        expect(out).toContain('<h1');
        expect(out).toContain('<h2');
        expect(out).toContain('<h3');
        expect(out).toContain('<h4');
    });

    it('renders internal links same-tab and external links new-tab with rel', () => {
        const out = markdownToHtml('[in](/blog/post) and [out](https://example.com)');
        expect(out).toContain('<a href="/blog/post"');
        expect(out).not.toMatch(/href="\/blog\/post"[^>]*target=/);
        expect(out).toMatch(/href="https:\/\/example\.com"[^>]*target="_blank"/);
        expect(out).toMatch(/href="https:\/\/example\.com"[^>]*rel="noopener noreferrer"/);
    });

    it('renders bold, italic, inline code, blockquote, hr, and lists', () => {
        const out = markdownToHtml(
            '**bold** *ital* `code`\n\n> quoted line\n\n---\n\n- item a\n- item b\n\n1. first\n2. second'
        );
        expect(out).toContain('<strong');
        expect(out).toContain('<em>ital</em>');
        expect(out).toContain('<code');
        expect(out).toContain('<blockquote');
        expect(out).toContain('<hr');
        expect(out).toContain('<ul');
        expect(out).toContain('<ol');
        expect((out.match(/<li/g) ?? []).length).toBe(4);
    });

    it('wraps plain text blocks in <p> and joins single newlines with spaces', () => {
        const out = markdownToHtml('line one\nline two\n\nsecond para');
        expect(out).toContain('<p');
        expect(out).toContain('line one line two');
        expect(out).toContain('second para');
    });
});
