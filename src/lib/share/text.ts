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

export function publicDisplayName(story: { display_mode: string; display_name: string | null; anon_number: number | string }): string {
    if (story.display_mode === 'named' && story.display_name) return story.display_name;
    return `Anonymous #${story.anon_number}`;
}
