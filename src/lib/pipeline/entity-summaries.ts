/**
 * UAP Entity Summary Generator — Shared Module
 *
 * Generates AI descriptions for canonical entities (orgs, persons, programs)
 * that are missing descriptions. Called by both the batch API route and the
 * intake pipeline after entity resolution.
 */

import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';

// ─── Summary Generation ─────────────────────────────────────────────────────

export async function generateEntitySummary(
    openai: OpenAI,
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

// ─── Video Title Helper ─────────────────────────────────────────────────────

export async function getVideoTitlesForEntity(
    supabase: SupabaseClient,
    videoIds: string[],
): Promise<string[]> {
    if (!videoIds?.length) return [];
    const { data } = await supabase
        .from('uap_vids')
        .select('title')
        .in('video_id', videoIds.slice(0, 10));
    return (data || []).map(v => v.title).filter(Boolean);
}

// ─── Pipeline Integration: Generate for Newly-Created Entities ──────────────

/**
 * After a video is processed, check if any linked entities are missing
 * descriptions and generate them. Only touches entities linked to this video.
 *
 * This is lightweight — it only generates for entities that DON'T already have
 * a description, so it's safe to call on every pipeline run.
 */
export async function generateMissingSummariesForVideo(
    supabase: SupabaseClient,
    openai: OpenAI,
    videoId: string,
): Promise<{ orgs: number; persons: number; programs: number }> {
    const counts = { orgs: 0, persons: 0, programs: 0 };

    // 1. Find orgs linked to this video that are missing descriptions
    const { data: orgs } = await supabase
        .from('uap_canonical_orgs')
        .select('id, canonical_name, org_type, aliases, total_mentions, linked_video_ids')
        .is('description', null)
        .contains('linked_video_ids', [videoId]);

    if (orgs?.length) {
        for (const org of orgs) {
            try {
                const titles = await getVideoTitlesForEntity(supabase, org.linked_video_ids);
                const desc = await generateEntitySummary(openai, 'organization', org.canonical_name, org, titles);
                if (desc) {
                    await supabase.from('uap_canonical_orgs').update({ description: desc }).eq('id', org.id);
                    counts.orgs++;
                }
            } catch (e) {
                console.error(`[EntitySummary] Failed for org ${org.canonical_name}:`, e);
            }
        }
    }

    // 2. Find persons linked to this video that are missing bios
    const { data: persons } = await supabase
        .from('uap_canonical_persons')
        .select('id, canonical_name, role, affiliation, aliases, total_mentions, avg_credibility_score, linked_video_ids')
        .is('bio', null)
        .contains('linked_video_ids', [videoId]);

    if (persons?.length) {
        for (const person of persons) {
            try {
                const titles = await getVideoTitlesForEntity(supabase, person.linked_video_ids);
                const bio = await generateEntitySummary(openai, 'person', person.canonical_name, person, titles);
                if (bio) {
                    await supabase.from('uap_canonical_persons').update({ bio }).eq('id', person.id);
                    counts.persons++;
                }
            } catch (e) {
                console.error(`[EntitySummary] Failed for person ${person.canonical_name}:`, e);
            }
        }
    }

    // 3. Find programs linked to this video that are missing descriptions
    const { data: programs } = await supabase
        .from('uap_canonical_programs')
        .select('id, canonical_name, program_type, aliases, total_mentions, linked_video_ids')
        .is('description', null)
        .contains('linked_video_ids', [videoId]);

    if (programs?.length) {
        for (const program of programs) {
            try {
                const titles = await getVideoTitlesForEntity(supabase, program.linked_video_ids);
                const desc = await generateEntitySummary(openai, 'program', program.canonical_name, program, titles);
                if (desc) {
                    await supabase.from('uap_canonical_programs').update({ description: desc }).eq('id', program.id);
                    counts.programs++;
                }
            } catch (e) {
                console.error(`[EntitySummary] Failed for program ${program.canonical_name}:`, e);
            }
        }
    }

    return counts;
}
