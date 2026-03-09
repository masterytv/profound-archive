import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/** Deterministic slug: lowercase, strip non-alpha, collapse spaces to hyphens */
function toSlug(question: string): string {
    return question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 100);
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

    // Store the raw question text as ai_query.
    // We intentionally do NOT generate a GPT HyDE here — using the raw question
    // ensures off-topic queries (cooking, sports, etc.) have naturally low cosine
    // similarity against the NDE corpus, so the no-results guard fires correctly.
    const ai_query = question;

    const { data: inserted, error } = await supabase
        .from('user_questions')
        .insert({ slug, question, ai_query })
        .select('slug')
        .single();

    if (error) {
        // Race condition: another request inserted the same slug
        if (error.code === '23505') return NextResponse.json({ slug });
        console.error('[questions/custom] Insert error:', error.message);
        return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
    }

    return NextResponse.json({ slug: inserted.slug });
}
