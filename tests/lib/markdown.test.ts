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

    it('documents S-6: the javascript: URL scheme passes into link hrefs unsanitized', () => {
        // CURRENT (vulnerable) behavior — the renderer does not validate URL schemes.
        // Quirk: the URL regex stops at the first ')', so 'javascript:alert(1)' is
        // truncated to 'javascript:alert(1' — but the scheme itself still lands in
        // href, and payloads without parens (e.g. 'javascript:alert`1`') survive
        // intact. After the Phase 1 fix these must expect the link to be neutralized.
        const truncated = markdownToHtml('[click me](javascript:alert(1))');
        expect(truncated).toContain('href="javascript:alert(1"');

        const intact = markdownToHtml('[click me](javascript:window.location=document.cookie)');
        expect(intact).toContain('href="javascript:window.location=document.cookie"');
    });

    it('documents S-6: the javascript: URL scheme passes into image srcs unsanitized', () => {
        const out = markdownToHtml('![alt text](javascript:window.location=document.cookie)');
        expect(out).toContain('src="javascript:window.location=document.cookie"');
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
