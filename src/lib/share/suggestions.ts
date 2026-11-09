/**
 * Editor suggestions (Gemini). Light edits only — the experiencer accepts or
 * rejects each section, so the prompt must never add facts or change voice.
 */
import { geminiConfigured, geminiJson } from '@/lib/ai/gemini';

export interface EditorResult {
    title: string;
    summary: string;
    edits: Array<{ section_index: number; suggested: string; reason: string }>;
    model: string;
}

const STYLE_SYSTEM = `You are a gentle copy editor for Project Profound, a site where people share near-death, spiritual and UAP/contact experiences in their own words.

Suggest LIGHT edits only:
- fix spelling, punctuation and obvious typos;
- break run-on text into readable paragraphs (use a blank line between paragraphs);
- remove filler words from speech transcripts ("um", "uh", repeated false starts);
- never add facts, feelings, interpretations or religious language the person did not use;
- never change the meaning, the order of events, or the person's voice and phrasing;
- keep it in the first person and in the original language.

Only return an edit for a section that actually needs one. Also propose a short, plain title (max 80 characters, no clickbait) and a neutral 2–3 sentence summary written in the third person ("The writer describes…") that does not name or identify the person.`;

const CRISIS_SYSTEM = `You help Project Profound publish a person's experience with care. The story mentions suicide, self-harm or similar. Before it is published on the website and YouTube, soften ONLY the explicit crisis wording so the story stays true but is safer to publish:
- replace explicit words (e.g. "suicide", "killed myself", "overdose", method details) with gentle, non-graphic phrasing such as "a very dark moment", "I tried to end my life" → "I reached a point where I didn't want to go on";
- remove any description of methods or means entirely;
- change nothing else: keep the person's voice, facts and order of events.
Only return an edit for a section that contains such wording.`;

const EDITS_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            section_index: { type: 'integer' },
            suggested: { type: 'string' },
            reason: { type: 'string' },
        },
        required: ['section_index', 'suggested', 'reason'],
    },
};

function numbered(sections: string[]): string {
    return sections.map((s, i) => `<section index="${i}">\n${s}\n</section>`).join('\n\n');
}

function cleanEdits(sections: string[], edits: EditorResult['edits']): EditorResult['edits'] {
    const seen = new Set<number>();
    return (edits ?? []).filter((e) => {
        if (!Number.isInteger(e.section_index) || e.section_index < 0 || e.section_index >= sections.length) return false;
        if (seen.has(e.section_index)) return false;
        const suggested = (e.suggested ?? '').trim();
        if (!suggested || suggested === sections[e.section_index].trim()) return false;
        seen.add(e.section_index);
        e.suggested = suggested;
        return true;
    });
}

export async function editorSuggestions(sections: string[]): Promise<EditorResult | null> {
    if (!geminiConfigured() || sections.length === 0) return null;
    const { data, model } = await geminiJson<{ title: string; summary: string; edits: EditorResult['edits'] }>({
        system: STYLE_SYSTEM,
        prompt: `Here is the story, split into numbered sections.\n\n${numbered(sections)}`,
        operation: 'share.editor-suggestions',
        responseSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                edits: EDITS_SCHEMA,
            },
            required: ['title', 'summary', 'edits'],
        },
    });
    return {
        title: (data.title ?? '').trim().slice(0, 120),
        summary: (data.summary ?? '').trim().slice(0, 800),
        edits: cleanEdits(sections, data.edits),
        model,
    };
}

export async function crisisSoftening(sections: string[]): Promise<{ edits: EditorResult['edits']; model: string } | null> {
    if (!geminiConfigured() || sections.length === 0) return null;
    const { data, model } = await geminiJson<{ edits: EditorResult['edits'] }>({
        system: CRISIS_SYSTEM,
        prompt: numbered(sections),
        operation: 'share.crisis-softening',
        responseSchema: { type: 'object', properties: { edits: EDITS_SCHEMA }, required: ['edits'] },
    });
    return { edits: cleanEdits(sections, data.edits), model };
}
