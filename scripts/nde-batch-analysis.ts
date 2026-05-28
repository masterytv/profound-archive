#!/usr/bin/env npx tsx
/**
 * Unified NDE Batch Analysis Runner — runs on Oracle via crontab.
 * Replaces 5 separate GHA workflows (core-elements, greyson, journey-flow,
 * phenomenology, transformation) that each curl-looped the same API routes.
 *
 * Instead of GHA → curl → Firebase → API route → AI function,
 * this script calls the AI functions directly with no HTTP overhead.
 *
 * Usage:
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline core-elements --limit 3 --loops 50
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline greyson --limit 3 --loops 50
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline journey-flow --limit 3 --loops 50
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline phenomenology --limit 3 --loops 50
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline transformation --limit 3 --loops 50
 *   npx tsx scripts/nde-batch-analysis.ts --pipeline all             # Run all 5 sequentially
 *
 * Oracle Crontab (staggered every 3 hours, offset by 10 minutes):
 *   10 */3 * * * cd ~/profound-archive && npx tsx scripts/nde-batch-analysis.ts --pipeline greyson >> logs/nde-greyson.log 2>&1
 *   20 */3 * * * cd ~/profound-archive && npx tsx scripts/nde-batch-analysis.ts --pipeline core-elements >> logs/nde-core-elements.log 2>&1
 *   30 */3 * * * cd ~/profound-archive && npx tsx scripts/nde-batch-analysis.ts --pipeline journey-flow >> logs/nde-journey-flow.log 2>&1
 *   40 */3 * * * cd ~/profound-archive && npx tsx scripts/nde-batch-analysis.ts --pipeline phenomenology >> logs/nde-phenomenology.log 2>&1
 *   50 1/3 * * * cd ~/profound-archive && npx tsx scripts/nde-batch-analysis.ts --pipeline transformation >> logs/nde-transformation.log 2>&1
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { analyzeCoreElements } from '../src/lib/ai/core-elements';
import { analyzeGreysonScore } from '../src/lib/ai/greyson';
import { analyzeJourneyFlow } from '../src/lib/ai/journey-flow';
import { analyzePhenomenologyEntities } from '../src/lib/ai/phenomenology-entities';
import { analyzeTransformationScore, classifyTransformationScore } from '../src/lib/ai/transformation';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineConfig {
    label: string;
    rpcName: string;
    analyzeFn: (transcript: string) => Promise<any>;
    saveFn: (supabase: SupabaseClient, videoId: string, result: any) => Promise<void>;
}

// ─── Save Functions (extract the DB upsert logic from each API route) ───────

async function upsertAnalysis(
    supabase: SupabaseClient,
    videoId: string,
    payload: Record<string, any>,
) {
    const { data: existing } = await supabase
        .from('nde_analysis')
        .select('video_id')
        .eq('video_id', videoId)
        .single();

    const { error } = existing
        ? await supabase.from('nde_analysis').update(payload).eq('video_id', videoId)
        : await supabase.from('nde_analysis').insert({ video_id: videoId, ...payload });

    if (error) throw new Error(`DB upsert failed for ${videoId}: ${error.message}`);
}

async function saveCoreElements(supabase: SupabaseClient, videoId: string, result: any) {
    if (!result) {
        await upsertAnalysis(supabase, videoId, {
            experience_type: 'analysis_failed',
            experience_type_confidence: 0,
            core_elements: { error: 'AI analysis returned null', timestamp: new Date().toISOString() },
            trigger_category: 'unknown',
            trigger_description: '',
            overall_tone: 'neutral',
            intensity_rating: -1,
            content_safety: {},
        });
        return;
    }
    await upsertAnalysis(supabase, videoId, {
        experience_type: result.experience_type,
        experience_type_confidence: result.type_confidence,
        core_elements: result.elements,
        trigger_category: result.trigger.category,
        trigger_description: result.trigger.description,
        overall_tone: result.overall_tone,
        intensity_rating: result.intensity_rating,
        content_safety: result.content_safety,
    });
}

async function saveGreyson(supabase: SupabaseClient, videoId: string, result: any) {
    if (!result) throw new Error('Analysis returned null');
    await upsertAnalysis(supabase, videoId, {
        total_greyson_score: result.total_score,
        scale_agreement: result.classification,
        greyson_breakdown: result.breakdown,
    });
}

async function saveJourneyFlow(supabase: SupabaseClient, videoId: string, result: any) {
    if (!result) {
        await upsertAnalysis(supabase, videoId, {
            journey_valid: false,
            journey_nde_type: 'analysis_failed',
            journey_sequence: { error: 'AI analysis returned null', timestamp: new Date().toISOString() },
            journey_notes: null,
        });
        return;
    }
    await upsertAnalysis(supabase, videoId, {
        journey_valid: result.valid,
        journey_nde_type: result.nde_type,
        journey_sequence: result.sequence,
        journey_notes: result.notes || result.reason || null,
    });
}

async function savePhenomenology(supabase: SupabaseClient, videoId: string, result: any) {
    if (!result) {
        await upsertAnalysis(supabase, videoId, {
            phenomenology: { error: 'AI analysis returned null', timestamp: new Date().toISOString() },
            entities: { encounters: [], entity_count: 0, error: 'AI analysis returned null' },
        });
        return;
    }
    await upsertAnalysis(supabase, videoId, {
        phenomenology: result.phenomenology,
        entities: {
            encounters: result.entities,
        },
    });
}

async function saveTransformation(supabase: SupabaseClient, videoId: string, result: any) {
    if (!result) {
        await upsertAnalysis(supabase, videoId, {
            transformation_score: -1,
            transformation_classification: 'analysis_failed',
            transformation_breakdown: { error: 'AI analysis returned null', timestamp: new Date().toISOString() },
        });
        return;
    }
    const score = result.quantitative_metrics.overall_transformation_score;
    const classification = classifyTransformationScore(score);
    await upsertAnalysis(supabase, videoId, {
        transformation_score: score,
        transformation_classification: classification,
        transformation_breakdown: result,
    });
}

// ─── Pipeline Registry ──────────────────────────────────────────────────────

const PIPELINES: Record<string, PipelineConfig> = {
    'core-elements': {
        label: 'Core Elements',
        rpcName: 'get_unanalyzed_core_elements_videos',
        analyzeFn: analyzeCoreElements,
        saveFn: saveCoreElements,
    },
    'greyson': {
        label: 'Greyson Scale',
        rpcName: 'get_unanalyzed_greyson_videos',
        analyzeFn: analyzeGreysonScore,
        saveFn: saveGreyson,
    },
    'journey-flow': {
        label: 'Journey Flow',
        rpcName: 'get_unanalyzed_journey_flow_videos',
        analyzeFn: analyzeJourneyFlow,
        saveFn: saveJourneyFlow,
    },
    'phenomenology': {
        label: 'Phenomenology & Entities',
        rpcName: 'get_unanalyzed_phenomenology_videos',
        analyzeFn: analyzePhenomenologyEntities,
        saveFn: savePhenomenology,
    },
    'transformation': {
        label: 'Transformation',
        rpcName: 'get_unanalyzed_transformation_videos',
        analyzeFn: analyzeTransformationScore,
        saveFn: saveTransformation,
    },
};

// ─── CLI Parsing ────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const flags: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--') && args[i + 1]) {
            flags[args[i].replace('--', '')] = args[i + 1];
            i++;
        }
    }

    const pipeline = flags['pipeline'] ?? 'all';
    const limit = parseInt(flags['limit'] ?? '3', 10);
    const loops = parseInt(flags['loops'] ?? '50', 10);

    if (pipeline !== 'all' && !PIPELINES[pipeline]) {
        console.error(`❌ Unknown pipeline: "${pipeline}"`);
        console.error(`   Available: ${Object.keys(PIPELINES).join(', ')}, all`);
        process.exit(1);
    }

    return { pipeline, limit, loops };
}

// ─── Batch Runner ───────────────────────────────────────────────────────────

async function runBatch(
    supabase: SupabaseClient,
    config: PipelineConfig,
    limit: number,
    loops: number,
) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔬 ${config.label} Analysis | limit=${limit} loops=${loops}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let totalProcessed = 0;
    let totalFailed = 0;
    let consecutiveEmpty = 0;
    const startTime = Date.now();

    for (let loop = 1; loop <= loops; loop++) {
        // Fetch batch via RPC
        const { data: videos, error: rpcError } = await supabase
            .rpc(config.rpcName, { batch_limit: limit });

        if (rpcError) {
            console.error(`  ❌ RPC error (${config.rpcName}): ${rpcError.message}`);
            break;
        }

        if (!videos || videos.length === 0) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= 2) {
                console.log(`  ✅ Queue empty — all ${config.label} analysis complete.`);
                break;
            }
            console.log(`  ⏸️ No videos in batch ${loop}. Retrying...`);
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }
        consecutiveEmpty = 0;

        // Process batch in parallel
        const results = await Promise.allSettled(
            videos.map(async (video: any) => {
                try {
                    const analysisResult = await config.analyzeFn(video.subtitles_punctuated);
                    await config.saveFn(supabase, video.videoId, analysisResult);
                    return { videoId: video.videoId, status: 'success' };
                } catch (err: any) {
                    return { videoId: video.videoId, status: 'failed', error: err.message };
                }
            })
        );

        const batchSuccess = results.filter(r =>
            r.status === 'fulfilled' && (r.value as any).status === 'success'
        ).length;
        const batchFailed = results.length - batchSuccess;
        totalProcessed += batchSuccess;
        totalFailed += batchFailed;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(
            `  [${loop}/${loops}] ✅ ${batchSuccess} | ❌ ${batchFailed} | ` +
            `Total: ${totalProcessed} | Elapsed: ${elapsed}s`
        );

        // Brief pause between batches to respect API rate limits
        if (loop < loops) await new Promise(r => setTimeout(r, 2000));
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🏁 ${config.label} done: ${totalProcessed} processed, ${totalFailed} failed (${totalElapsed}s)`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const { pipeline, limit, loops } = parseArgs();
    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [nde-batch-analysis] ${timestamp} | pipeline=${pipeline} limit=${limit} loops=${loops}`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const pipelineNames = pipeline === 'all' ? Object.keys(PIPELINES) : [pipeline];

    for (const name of pipelineNames) {
        await runBatch(supabase, PIPELINES[name], limit, loops);
    }

    console.log(`\n✅ [nde-batch-analysis] All pipelines complete.`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
