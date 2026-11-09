/**
 * Pure text helpers for stories: sections, assembling edits, slugs.
 */
import { randomSlugSuffix } from './tokens';

/** Split text into sections (paragraph groups) that the editor reviews one by one. */
export function splitSections(text: string, targetChars = 1200): string[] {
    const paragraphs = text
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    const sections: string[] = [];
    let current = '';
    for (const p of paragraphs) {
        if (current && current.length + p.length + 2 > targetChars) {
            sections.push(current);
            current = p;
        } else {
            current = current ? `${current}\n\n${p}` : p;
        }
    }
    if (current) sections.push(current);
    // A wall of text with no blank lines: split on sentences instead.
    return sections.flatMap((s) => (s.length > targetChars * 2 ? splitLong(s, targetChars) : [s]));
}

function splitLong(text: string, targetChars: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
    const out: string[] = [];
    let cur = '';
    for (const s of sentences) {
        if (cur && cur.length + s.length > targetChars) {
            out.push(cur.trim());
            cur = s;
        } else {
            cur += s;
        }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

export interface SectionSuggestion {
    section_index: number;
    suggested: string;
    status: 'pending' | 'accepted' | 'rejected';
}

/**
 * Build the final text: each section is replaced by its accepted suggestion,
 * otherwise kept as written. Pending counts as rejected.
 */
export function assembleText(sections: string[], suggestions: SectionSuggestion[]): string {
    const accepted = new Map<number, string>();
    for (const s of suggestions) {
        if (s.status === 'accepted') accepted.set(s.section_index, s.suggested);
    }
    return sections.map((sec, i) => (accepted.get(i) ?? sec).trim()).filter(Boolean).join('\n\n');
}

export function slugify(input: string, maxLen = 60): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLen)
        .replace(/-+$/g, '');
}

/** Story slugs are unguessable: a readable stem plus a random suffix. */
export function storySlug(title: string | null | undefined): string {
    const stem = slugify(title || 'experience', 50) || 'experience';
    return `${stem}-${randomSlugSuffix()}`;
}

export function wordCount(text: string | null | undefined): number {
    return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The name shown publicly. 'named': the full name. 'anonymous' (full name not
 * shared): the name they chose to show instead (first name, initials, a
 * nickname), or "Anonymous #N" if they left it blank.
 */
export function publicDisplayName(story: { display_mode: string; display_name: string | null; anon_number: number | string }): string {
    const name = story.display_name?.trim();
    if (name) return name;
    return `Anonymous #${story.anon_number}`;
}

function sentences(text: string): string[] {
    return (text.replace(/\s+/g, ' ').trim().match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)\s*/g) ?? []).map((x) => x.trim()).filter(Boolean);
}

/**
 * Gemini sometimes merges the writer's paragraphs into one despite being told
 * not to. If the suggestion has fewer paragraphs than the original, put the
 * breaks back where the writer had them, matching sentence by sentence. If the
 * sentence counts don't line up (the editor split or joined sentences), the
 * suggestion is returned unchanged.
 */
export function restoreParagraphs(original: string, suggested: string): string {
    const origParas = original.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const sugParas = suggested.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (origParas.length <= 1 || sugParas.length >= origParas.length) return suggested;
    const counts = origParas.map((p) => sentences(p).length);
    const sugSentences = sentences(suggested);
    if (counts.some((c) => c === 0) || counts.reduce((a, b) => a + b, 0) !== sugSentences.length) return suggested;
    const out: string[] = [];
    let k = 0;
    for (const c of counts) {
        out.push(sugSentences.slice(k, k + c).join(' '));
        k += c;
    }
    return out.join('\n\n');
}
