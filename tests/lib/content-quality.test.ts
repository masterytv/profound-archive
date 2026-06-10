/**
 * Tests for the publish-quality gate (AI-6): damaged bodies must be held as
 * drafts; clean bodies publish.
 */
import { describe, it, expect, vi } from 'vitest';

vi.spyOn(console, 'warn').mockImplementation(() => {});

import { findContentDamage, gatePublishStatus } from '@/lib/pipeline/content-quality';

describe('findContentDamage', () => {
    it('flags unrendered link constructs visible in body text (real sample)', () => {
        const issues = findContentDamage(
            '[Research on religious switching](https://pmc.ncbi.nlm.nih.gov shows that many faith communities use afterlife consequences.'
        );
        expect(issues.length).toBeGreaterThan(0);
    });

    it('flags leaked HTML attribute fragments (real sample)', () => {
        const issues = findContentDamage(
            'A [2001 study in The Lancet](https://pubmed.ncbi.nlm.nih.gov/11755611/"class="text-blue-600">he expected judgment by Pim van Lommel.'
        );
        expect(issues.length).toBeGreaterThan(0);
    });

    it('passes a clean article body', () => {
        const issues = findContentDamage(
            '## A Heading\n\nNormal prose with a [valid link](/questions/some-slug) and **bold** text.\n\n> A quote.\n\n- a list item'
        );
        expect(issues).toEqual([]);
    });

    it('passes prose containing ordinary parentheses and brackets like [1] citations', () => {
        const issues = findContentDamage(
            'Some text (with parens) and a numeric citation [1]. More prose follows [2].'
        );
        expect(issues).toEqual([]);
    });
});

describe('gatePublishStatus', () => {
    it('publishes clean bodies', () => {
        const gate = gatePublishStatus('Just a normal paragraph.', 'clean-slug');
        expect(gate.status).toBe('published');
        expect(gate.contentIssues).toEqual([]);
    });

    it('holds damaged bodies as drafts', () => {
        const gate = gatePublishStatus('broken [link](/uap Yes, and prose continues.', 'damaged-slug');
        expect(gate.status).toBe('draft');
        expect(gate.contentIssues.length).toBeGreaterThan(0);
    });
});
