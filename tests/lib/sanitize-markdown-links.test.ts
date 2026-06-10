/**
 * Regression tests for sanitizeMarkdownLinks (blog pipeline, AI-6).
 * Every "real sample" case below is taken verbatim from damage observed in
 * published blog_posts rows on 2026-06-10.
 */
import { describe, it, expect, vi } from 'vitest';

vi.spyOn(console, 'log').mockImplementation(() => {});

import { sanitizeMarkdownLinks } from '@/lib/pipeline/blog-article';

describe('sanitizeMarkdownLinks — valid links must survive (Pass-2 false-positive regression)', () => {
    it('real sample: a valid internal link with a long slug is NOT mangled', () => {
        // Pass 2 used to strip the slug out of the URL, leaving "](/questions."
        const md =
            "It's that they learn [dying itself isn't what they thought it would be](/questions/dying-itself-isnt-what-they-thought-it-would-be). The thing we spend our whole lives dreading.";
        const out = sanitizeMarkdownLinks(md);
        expect(out).toContain('[dying itself isn\'t what they thought it would be](/questions/dying-itself-isnt-what-they-thought-it-would-be)');
        expect(out).not.toContain('](/questions.');
    });

    it('valid external links with paths survive untouched', () => {
        const md = 'A [2001 study](https://pubmed.ncbi.nlm.nih.gov/11755611/) found that religion did not predict NDEs.';
        expect(sanitizeMarkdownLinks(md)).toBe(md);
    });

    it('no placeholder tokens ever leak into output', () => {
        const md = 'See [a](/video/abc) and [b](/questions/x-y) and [c](https://example.com/p) here.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).not.toContain(String.fromCharCode(0));
        expect(out).toBe(md);
    });
});

describe('sanitizeMarkdownLinks — unclosed internal stubs (real samples)', () => {
    it('real sample: "](/uap " prose continuation is stripped to text', () => {
        const md = '[Are there cases where multiple independent witnesses saw the same UAP event?](/uap Yes, and Graves had a squadron full of them.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).toContain('Are there cases where multiple independent witnesses saw the same UAP event?');
        expect(out).not.toContain('](/uap');
    });

    it('real sample: truncated "](/video/" at end of body is stripped to text', () => {
        const md = 'do not keep talking about this, I do not want to have to deal with this](/video/';
        const out = sanitizeMarkdownLinks(md);
        expect(out).not.toContain('](/video/');
    });

    it('real sample: "](/video/PARTIAL" followed by newline is stripped', () => {
        const md = '["A near-death experience is not a death experience,"](/video/XLJ4V\n\nNext paragraph.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).not.toContain('](/video');
        expect(out).toContain('Next paragraph.');
    });
});

describe('sanitizeMarkdownLinks — unclosed external links (real samples)', () => {
    it('real sample: domain-welded comma is stripped without swallowing later parens', () => {
        const md =
            '[Research on religious switching](https://pmc.ncbi.nlm.nih.gov shows that many faith communities use afterlife consequences as a deterrent.\n\nLater paragraph (with parens) stays intact.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).toContain('Research on religious switching');
        expect(out).not.toContain('](https://pmc');
        expect(out).toContain('Later paragraph (with parens) stays intact.');
    });

    it('real sample: TWO unclosed domain-only links on one line are BOTH stripped', () => {
        const md =
            'A [Reddit thread from researchers](https://www.reddit.com asking about generational patterns found consistent reports. Even [another family account on Reddit](https://www.reddit.com describes multi-generational experiences.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).not.toContain('](http');
        expect(out).toContain('Reddit thread from researchers');
        expect(out).toContain('another family account on Reddit');
    });

    it('a URL with a real path is rescued as a proper link plus trailing text', () => {
        const md = '[the study](https://pubmed.ncbi.nlm.nih.gov/11755611/ which followed cardiac arrest survivors.\n\nNext.';
        const out = sanitizeMarkdownLinks(md);
        expect(out).toContain('[the study](https://pubmed.ncbi.nlm.nih.gov/11755611/)');
        expect(out).toContain('which followed cardiac arrest survivors.');
    });
});

describe('sanitizeMarkdownLinks — later passes still work after link protection', () => {
    it('hybrid markdown/HTML attribute leak is cleaned (Pass 0)', () => {
        const md = '[quote](/video/abc?t=33" class="text-blue-600 dark:text-blue-400 hover:underline">Anchor';
        const out = sanitizeMarkdownLinks(md);
        expect(out).not.toContain('class="');
    });

    it('YouTube URLs are still converted to internal /video links (Pass 4)', () => {
        const out = sanitizeMarkdownLinks('[watch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)');
        expect(out).toBe('[watch](/video/dQw4w9WgXcQ)');
    });

    it('well-formed but domain-only external links are still stripped (Pass 5)', () => {
        const out = sanitizeMarkdownLinks('[a journal](https://journals.sagepub.com) said so.');
        expect(out).toBe('a journal said so.');
    });
});
