import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Lazy init — avoids build-time crash when env var is absent (see LEARNINGS.md §4A)
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Deterministic slug: lowercase, strip non-alpha, collapse spaces to hyphens */
function toSlug(question: string): string {
    return question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 100);
}

/**
 * Generate a HyDE (Hypothetical Document Embedding) passage for the question.
 *
 * Two-step approach:
 * 1. Classify — a tiny 3-token call asks GPT whether the question is NDE-relevant.
 *    Returns raw question text (low cosine → no-results guard fires) if not relevant.
 * 2. Generate — if relevant, a second call writes a specific first-person NDE passage
 *    mentioning the exact subject of the question, ready to embed.
 *
 * Falls back to raw question text if OpenAI fails at either step.
 */
async function generateHyde(question: string): Promise<string> {
    const openai = getOpenAI();

    // ── Step 1: relevance gate ────────────────────────────────────────────────
    try {
        const gateResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 3,
            messages: [
                {
                    role: 'system',
                    content:
                        'You classify questions. Reply with only YES or NO.\n' +
                        'Answer YES if the question is about ANY of these: near-death experiences (NDEs), ' +
                        'death, dying, the afterlife, heaven, hell, ghosts, spirits, souls, grief, loss, ' +
                        'life after death, consciousness, out-of-body experiences, spiritual experiences, ' +
                        'whether NDEs are real or proven, what happens when we die, deceased loved ones, ' +
                        'animals or pets in the afterlife, or ANY topic a mourning or spiritually curious ' +
                        'person might ask about NDEs.\n' +
                        'Answer NO only for clearly unrelated topics (cooking, sports, tech, money, etc.).',
                },
                { role: 'user', content: question },
            ],
        });
        const verdict = gateResponse.choices[0]?.message?.content?.trim().toUpperCase();
        if (verdict && verdict.startsWith('NO')) {
            // Off-topic — raw text embeds with naturally low cosine → no-results guard fires
            return question;
        }
    } catch (err) {
        console.error('[questions/custom] Gate classification failed, proceeding with HyDE:', err);
        // If the gate fails, proceed with HyDE generation rather than blocking
    }

    // ── Step 2: generate specific HyDE passage ────────────────────────────────
    try {
        const FORBIDDEN_OPENERS = [
            '"As I floated"',
            '"In that serene space"',
            '"When I crossed over"',
            '"As I hovered"',
            '"In the serene"',
            '"As I stood there"',
        ].join(', ');

        const hydeResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.85,
            max_tokens: 200,
            messages: [
                {
                    role: 'system',
                    content:
                        'You write realistic NDE (near-death experience) testimony for semantic search indexing.\n\n' +
                        'Given a question, write 3-4 short sentences that sound like they were ACTUALLY SPOKEN by a regular person in a casual YouTube interview or podcast after their NDE. This is NOT creative writing.\n\n' +
                        'VOICE RULES:\n' +
                        '- Plain, everyday spoken language — how a regular person talks, not how a writer writes\n' +
                        '- Short sentences, 8-18 words each. No compound sentences.\n' +
                        '- Lowercase is fine if it sounds more natural and conversational\n' +
                        '- No metaphors, no poetic imagery, no scene-setting language\n' +
                        '- Sounds unrehearsed, honest — like a real person recounting their experience\n\n' +
                        'CONTENT RULES:\n' +
                        '- Directly address what the question is asking — if about an abuser, say "my dad" or "my ex" was there\n' +
                        '- If about pets: say the type of animal (my cat, my dog)\n' +
                        '- If about children: say "my baby" or "my son"\n' +
                        '- Each sentence hits the question from a slightly different angle\n' +
                        '- No: "shimmering", "ethereal", "luminous", "expanse", "radiant", "enveloped", "profound"\n\n' +
                        'EXAMPLE for "What if someone who hurt me is waiting on the other side?"\n' +
                        'BAD: "The shimmering expanse of color was interrupted by a familiar, yet complicated face..."\n' +
                        'GOOD: "my dad was there. the man who hurt me my whole life was standing right there. but he wasn\'t the same person. i understood everything in an instant and i forgave him."\n\n' +
                        'Output ONLY the sentences — no labels, no preamble, no quotation marks.',
                },
                { role: 'user', content: question },
            ],
        });
        const passage = hydeResponse.choices[0]?.message?.content?.trim();
        if (passage && passage.length > 20) return passage;
    } catch (err) {
        console.error('[questions/custom] HyDE generation failed, falling back to raw question:', err);
    }

    // Fallback — raw question text
    return question;
}

export async function POST(req: NextRequest) {
    let question: string;
    try {
        const body = await req.json();
        question = (body.question ?? '').trim();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!question || question.length < 5) {
        return NextResponse.json({ error: 'Question too short' }, { status: 400 });
    }
    if (question.length > 300) {
        return NextResponse.json({ error: 'Question too long (max 300 chars)' }, { status: 400 });
    }

    const slug = toSlug(question);

    // Idempotency: return existing user question if already saved
    const { data: existing } = await supabase
        .from('user_questions')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
    if (existing) return NextResponse.json({ slug: existing.slug });

    // Don't duplicate a curated question — redirect to it instead
    const { data: curated } = await supabase
        .from('nde_questions')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
    if (curated) return NextResponse.json({ slug: curated.slug });

    // Generate a HyDE passage for richer semantic matching.
    // Runs only once per unique question since the result is persisted below.
    const ai_query = await generateHyde(question);

    const { data: inserted, error } = await supabase
        .from('user_questions')
        .insert({ slug, question, ai_query })
        .select('slug')
        .single();

    if (error) {
        // Race condition: another request inserted the same slug simultaneously
        if (error.code === '23505') return NextResponse.json({ slug });
        console.error('[questions/custom] Insert error:', error.message);
        return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
    }

    return NextResponse.json({ slug: inserted.slug });
}
