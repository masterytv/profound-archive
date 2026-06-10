/**
 * Content-quality gate for generated blog bodies (IMPROVEMENT_PLAN AI-6).
 *
 * The link sanitizer repairs what it can; this gate is the backstop that
 * decides whether a body is fit to publish. It renders the markdown exactly
 * the way the public blog pages do and scans the visible text for damage
 * signatures. Anything caught here is held as a draft for human review
 * instead of being published — protecting SEO/AEO and readability.
 */
import { markdownToHtml } from '../markdown';

export function findContentDamage(bodyMdx: string): string[] {
    const issues: string[] = [];
    const html = markdownToHtml(bodyMdx || '');
    // What a reader (or crawler) would actually see, tags removed.
    const visibleText = html.replace(/<[^>]+>/g, '');

    if (/\]\(/.test(visibleText)) {
        issues.push('unrendered markdown link construct "](...)" visible in body text');
    }
    if (/class="|class=&quot;|href="|href=&quot;/.test(visibleText)) {
        issues.push('HTML attribute fragments visible in body text');
    }
    if (/&lt;(h[1-6]|a|p|div|script)(?:[\s>]|&gt;)/.test(visibleText)) {
        issues.push('escaped HTML tags visible in body text');
    }
    return issues;
}

/**
 * Returns the publish fields for an insert: 'published' when the body is
 * clean, 'draft' (held for review) when damage signatures remain.
 */
export function gatePublishStatus(
    bodyMdx: string,
    slug: string,
): { status: 'published' | 'draft'; contentIssues: string[] } {
    const contentIssues = findContentDamage(bodyMdx);
    if (contentIssues.length > 0) {
        console.warn(
            `[content-gate] Holding "${slug}" as DRAFT — body failed quality gate: ${contentIssues.join('; ')}`
        );
        return { status: 'draft', contentIssues };
    }
    return { status: 'published', contentIssues };
}
