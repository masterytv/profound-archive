/**
 * UAP Entity Summary Generator
 *
 * POST /api/uap/generate-entity-summaries
 *
 * Generates AI descriptions for all canonical entities (orgs, persons, programs)
 * that are currently missing descriptions. Uses GPT-4o-mini with context from
 * linked video titles and entity metadata.
 *
 * Auth: Requires CRON_SECRET header for production safety.
 *
 * Usage from terminal:
 *   curl -X POST http://localhost:3000/api/uap/generate-entity-summaries \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Auth ───────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
    if (process.env.NODE_ENV === 'development') return true;
    const authHeader = req.headers.get('authorization');
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Summary Generation ─────────────────────────────────────────────────────

async function generateSummary(
    entityType: 'organization' | 'person' | 'program',
    name: string,
    metadata: Record<string, unknown>,
    videoTitles: string[],
): Promise<string> {
    const contextParts = [
        `Entity type: ${entityType}`,
        `Name: ${name}`,
    ];

    if (metadata.org_type) contextParts.push(`Organization type: ${metadata.org_type}`);
    if (metadata.role) contextParts.push(`Role: ${metadata.role}`);
    if (metadata.affiliation) contextParts.push(`Affiliation: ${metadata.affiliation}`);
    if (metadata.program_type) contextParts.push(`Program type: ${metadata.program_type}`);
    if (metadata.aliases?.length) contextParts.push(`Aliases: ${(metadata.aliases as string[]).join(', ')}`);
    if (metadata.total_mentions) contextParts.push(`Mentioned in ${metadata.total_mentions} videos`);
    if (metadata.avg_credibility_score) contextParts.push(`Average credibility score: ${metadata.avg_credibility_score}/100`);

    if (videoTitles.length > 0) {
        contextParts.push(`\nAppears in these UAP/UFO research videos:\n${videoTitles.map(t => `- ${t}`).join('\n')}`);
    }

    const systemPrompt = `You are a factual research assistant for a UAP (Unidentified Aerial Phenomena) and UFO research archive called Project Profound.

Write a concise 2-4 sentence description of the given ${entityType} based ONLY on the provided context. Focus on:
- What is known about this ${entityType}
- Its relevance to UAP/UFO research, disclosure, or contact phenomena
- Any notable connections to government, military, intelligence, or scientific communities

Rules:
- Be factual and neutral. Do not speculate.
- Do not use phrases like "according to" or "it is claimed that"
- Write in third person, present tense
- If you don't have enough context to write meaningfully, write a brief factual identification only
- Do NOT mention Project Profound or "this archive" in the description`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contextParts.join('\n') },
        ],
        temperature: 0.3,
        max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || '';
}

// ─── Batch Processors ───────────────────────────────────────────────────────

async function getVideoTitles(videoIds: string[]): Promise<string[]> {
    if (!videoIds?.length) return [];
    const { data } = await supabase
        .from('uap_vids')
        .select('title')
        .in('video_id', videoIds.slice(0, 10)); // Cap at 10 for context window
    return (data || []).map(v => v.title).filter(Boolean);
}

async function processOrgs(): Promise<{ updated: number; errors: string[] }> {
    const { data: orgs } = await supabase
        .from('uap_canonical_orgs')
        .select('id, canonical_name, org_type, aliases, total_mentions, linked_video_ids')
        .is('description', null)
        .order('total_mentions', { ascending: false });

    if (!orgs?.length) return { updated: 0, errors: [] };

    let updated = 0;
    const errors: string[] = [];

    for (const org of orgs) {
        try {
            const videoTitles = await getVideoTitles(org.linked_video_ids);
            const description = await generateSummary('organization', org.canonical_name, org, videoTitles);
            if (description) {
                await supabase
                    .from('uap_canonical_orgs')
                    .update({ description })
                    .eq('id', org.id);
                updated++;
                console.log(`[EntitySummary] Org: ${org.canonical_name} ✓`);
            }
        } catch (err) {
            const msg = `Org ${org.canonical_name}: ${err instanceof Error ? err.message : 'unknown'}`;
            errors.push(msg);
            console.error(`[EntitySummary] ${msg}`);
        }
    }

    return { updated, errors };
}

async function processPersons(): Promise<{ updated: number; errors: string[] }> {
    const { data: persons } = await supabase
        .from('uap_canonical_persons')
        .select('id, canonical_name, role, affiliation, aliases, total_mentions, avg_credibility_score, linked_video_ids')
        .is('bio', null)
        .order('total_mentions', { ascending: false });

    if (!persons?.length) return { updated: 0, errors: [] };

    let updated = 0;
    const errors: string[] = [];

    for (const person of persons) {
        try {
            const videoTitles = await getVideoTitles(person.linked_video_ids);
            const bio = await generateSummary('person', person.canonical_name, person, videoTitles);
            if (bio) {
                await supabase
                    .from('uap_canonical_persons')
                    .update({ bio })
                    .eq('id', person.id);
                updated++;
                console.log(`[EntitySummary] Person: ${person.canonical_name} ✓`);
            }
        } catch (err) {
            const msg = `Person ${person.canonical_name}: ${err instanceof Error ? err.message : 'unknown'}`;
            errors.push(msg);
            console.error(`[EntitySummary] ${msg}`);
        }
    }

    return { updated, errors };
}

async function processPrograms(): Promise<{ updated: number; errors: string[] }> {
    const { data: programs } = await supabase
        .from('uap_canonical_programs')
        .select('id, canonical_name, program_type, aliases, total_mentions, linked_video_ids')
        .is('description', null)
        .order('total_mentions', { ascending: false });

    if (!programs?.length) return { updated: 0, errors: [] };

    let updated = 0;
    const errors: string[] = [];

    for (const program of programs) {
        try {
            const videoTitles = await getVideoTitles(program.linked_video_ids);
            const description = await generateSummary('program', program.canonical_name, program, videoTitles);
            if (description) {
                await supabase
                    .from('uap_canonical_programs')
                    .update({ description })
                    .eq('id', program.id);
                updated++;
                console.log(`[EntitySummary] Program: ${program.canonical_name} ✓`);
            }
        } catch (err) {
            const msg = `Program ${program.canonical_name}: ${err instanceof Error ? err.message : 'unknown'}`;
            errors.push(msg);
            console.error(`[EntitySummary] ${msg}`);
        }
    }

    return { updated, errors };
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[EntitySummary] Starting batch entity summary generation...');

    const [orgs, persons, programs] = await Promise.all([
        processOrgs(),
        processPersons(),
        processPrograms(),
    ]);

    const result = {
        orgs: { updated: orgs.updated, errors: orgs.errors.length },
        persons: { updated: persons.updated, errors: persons.errors.length },
        programs: { updated: programs.updated, errors: programs.errors.length },
        total_updated: orgs.updated + persons.updated + programs.updated,
        all_errors: [...orgs.errors, ...persons.errors, ...programs.errors],
    };

    console.log(`[EntitySummary] Done. Updated ${result.total_updated} entities.`);

    return NextResponse.json(result);
}
