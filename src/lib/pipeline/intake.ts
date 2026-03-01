/**
 * Video Intake Pipeline Orchestrator
 * 
 * Coordinates the end-to-end processing of a single YouTube video:
 * 1. Parse URL → videoId
 * 2. Check if already in DB
 * 3. Scrape video + channel metadata
 * 4. Fetch and process captions
 * 5. Classify experience type (lightweight gate)
 * 6. Run full analysis suite (7 passes in parallel)
 * 7. Generate embeddings for search and chat
 * 8. Sync to Typesense search index
 * 9. Generate experience fingerprint
 * 
 * Designed as a pure function so it can be called from:
 * - Admin UI form (via API route)
 * - Future scheduler/cron job
 * - CLI scripts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Typesense from 'typesense';
import { parseYouTubeUrl, fetchVideoMetadata, fetchChannelMetadata, type VideoMetadata } from '@/lib/youtube/scraper';
import { fetchCaptions } from '@/lib/youtube/subtitles';
import { processTranscripts, type ProcessedTranscripts } from '@/lib/youtube/transcript-processor';
import { classifyExperience, type ClassificationResult } from '@/lib/ai/classify-experience';
import { parseIsoDuration } from '@/lib/scanner/discover';
import { analyzeGreysonScore } from '@/lib/ai/greyson';
import { analyzeTransformationScore, classifyTransformationScore } from '@/lib/ai/transformation';
import { analyzeCoreElements } from '@/lib/ai/core-elements';
import { analyzePhenomenologyEntities } from '@/lib/ai/phenomenology-entities';
import { analyzeJourneyFlow } from '@/lib/ai/journey-flow';
import { analyzeCvndeScore } from '@/lib/ai/cvnde';
import { generateNdeSummary } from '@/lib/ai/nde-summary';
import { buildFingerprint } from '@/lib/ai/fingerprint';

// ─── Types ───────────────────────────────────────────────────────────────────

export type IntakeStatus =
    | 'scraping'
    | 'classifying'
    | 'analyzing'
    | 'indexing'
    | 'complete'
    | 'failed'
    | 'not_profound'
    | 'no_captions'
    | 'already_exists'
    | 'is_short';

export interface IntakeResult {
    status: IntakeStatus;
    videoId: string;
    title?: string;
    classification?: ClassificationResult | null;
    analysisSummary?: string;
    error?: string;
    /** Step-by-step progress log for UI display */
    steps: IntakeStep[];
}

export interface IntakeStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    message?: string;
    duration_ms?: number;
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    return createClient(url, key);
}

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    return new OpenAI({ apiKey });
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Process a single YouTube video through the full intake pipeline.
 * 
 * @param youtubeUrl - Any valid YouTube URL
 * @param onStep - Optional callback for real-time progress updates
 * @returns IntakeResult with final status and processing details
 */
export async function processVideoIntake(
    youtubeUrl: string,
    onStep?: (step: IntakeStep) => void
): Promise<IntakeResult> {
    const steps: IntakeStep[] = [];
    const supabase = getSupabaseAdmin();

    const logStep = (name: string, status: IntakeStep['status'], message?: string, duration_ms?: number) => {
        const step: IntakeStep = { name, status, message, duration_ms };
        steps.push(step);
        onStep?.(step);
        console.log(`[Intake] ${status.toUpperCase()}: ${name}${message ? ` — ${message}` : ''}`);
    };

    try {
        // ─── Step 1: Parse URL ───────────────────────────────────────
        const startParse = Date.now();
        const videoId = parseYouTubeUrl(youtubeUrl);
        if (!videoId) {
            logStep('Parse URL', 'failed', 'Invalid YouTube URL');
            return { status: 'failed', videoId: '', steps, error: 'Invalid YouTube URL' };
        }
        logStep('Parse URL', 'success', `Extracted videoId: ${videoId}`, Date.now() - startParse);

        // ─── Step 2: Check if already in DB ──────────────────────────
        const startCheck = Date.now();
        const { data: existing } = await supabase
            .from('nde_vids')
            .select('videoId, title, isNde, intake_status')
            .eq('videoId', videoId)
            .single();

        if (existing) {
            // Only block if the video was FULLY processed successfully
            if (existing.intake_status === 'complete') {
                logStep('Check Database', 'success', `Already exists: "${existing.title}" (${existing.isNde})`, Date.now() - startCheck);
                return {
                    status: 'already_exists',
                    videoId,
                    title: existing.title,
                    steps,
                };
            }
            // Video exists but wasn't fully processed — allow re-processing
            logStep('Check Database', 'success', `Re-processing (previous status: ${existing.intake_status})`, Date.now() - startCheck);
        } else {
            logStep('Check Database', 'success', 'New video — proceeding', Date.now() - startCheck);
        }

        // ─── Step 3: Scrape video metadata ───────────────────────────
        const startMeta = Date.now();
        logStep('Scrape Metadata', 'running');
        const metadata = await fetchVideoMetadata(videoId);
        if (!metadata) {
            logStep('Scrape Metadata', 'failed', 'Video not found or is private/removed');
            return { status: 'failed', videoId, steps, error: 'Video not found on YouTube' };
        }
        logStep('Scrape Metadata', 'success', `"${metadata.title}"`, Date.now() - startMeta);

        // ─── Step 3b: Shorts gate ─────────────────────────────────────
        // YouTube Shorts max = 180s (as of Oct 2024). Reject before fetching
        // captions or running AI — saves Apify + OpenAI cost entirely.
        if (metadata.duration) {
            const durationSecs = parseIsoDuration(metadata.duration);
            if (durationSecs !== null && durationSecs <= 180) {
                logStep('Shorts Gate', 'skipped',
                    `Duration ${durationSecs}s ≤ 180s — YouTube Short, skipping pipeline`);
                await insertVideoRecord(supabase, videoId, metadata, null, 'not_nde', 'is_short');
                return {
                    status: 'is_short',
                    videoId,
                    title: metadata.title || undefined,
                    steps,
                };
            }
        }

        // ─── Step 4: Ensure channel exists ───────────────────────────
        if (metadata.channelId) {
            const startChannel = Date.now();
            const { data: existingChannel } = await supabase
                .from('channels')
                .select('channel_id')
                .eq('channel_id', metadata.channelId)
                .single();

            if (!existingChannel) {
                logStep('Enrich Channel', 'running', 'New channel — fetching metadata');
                const channelData = await fetchChannelMetadata(metadata.channelId);
                if (channelData) {
                    const { error: channelError } = await supabase
                        .from('channels')
                        .upsert(channelData, { onConflict: 'channel_id' });
                    if (channelError) {
                        logStep('Enrich Channel', 'failed', channelError.message);
                        // Non-fatal — continue anyway
                    } else {
                        logStep('Enrich Channel', 'success', `Added: ${channelData.name}`, Date.now() - startChannel);
                    }
                } else {
                    logStep('Enrich Channel', 'failed', 'Could not fetch channel metadata');
                }
            } else {
                logStep('Enrich Channel', 'skipped', 'Channel already in DB');
            }
        }

        // ─── Step 5: Fetch captions ──────────────────────────────────
        const startCaptions = Date.now();
        logStep('Fetch Captions', 'running');
        const captionResult = await fetchCaptions(videoId);

        if (!captionResult || captionResult.segments.length === 0) {
            // No captions — still insert the video with metadata
            logStep('Fetch Captions', 'failed', 'No captions available');
            await insertVideoRecord(supabase, videoId, metadata, null, 'insufficient_info', 'no_captions');
            return {
                status: 'no_captions',
                videoId,
                title: metadata.title || undefined,
                steps,
            };
        }
        logStep('Fetch Captions', 'success',
            `${captionResult.segments.length} segments (${captionResult.language}, ${captionResult.isAutoGenerated ? 'auto' : 'manual'})`,
            Date.now() - startCaptions
        );

        // ─── Step 6: Process transcripts ─────────────────────────────
        const startProcess = Date.now();
        const transcripts = processTranscripts(captionResult.segments, videoId);
        logStep('Process Transcripts', 'success',
            `${transcripts.searchChunks.length} search chunks, ${transcripts.chatChunks.length} chat chunks`,
            Date.now() - startProcess
        );

        // ─── Step 7: Insert initial video record ─────────────────────
        await insertVideoRecord(supabase, videoId, metadata, transcripts, null, 'classifying');

        // ─── Step 8: Classify experience ─────────────────────────────
        const startClassify = Date.now();
        logStep('Classify Experience', 'running');
        let classificationErrorStr = '';
        let classification;
        try {
            classification = await classifyExperience(
                transcripts.punctuated,
                metadata.title || undefined,
                metadata.description || undefined,
            );
        } catch (e: any) {
            classificationErrorStr = e.message || String(e);
        }

        if (!classification) {
            logStep('Classify Experience', 'failed', 'Classification returned null: ' + classificationErrorStr);
            await updateIntakeStatus(supabase, videoId, 'failed', 'Classification failed: ' + classificationErrorStr);
            return { status: 'failed', videoId, title: metadata.title || undefined, steps, error: 'Classification failed: ' + classificationErrorStr };
        }

        logStep('Classify Experience', 'success',
            `${classification.experience_type} (${classification.confidence}% confidence) — ${classification.isNde_value}`,
            Date.now() - startClassify
        );

        // Update isNde value and experiencer name
        const classificationUpdate: Record<string, any> = {
            isNde: classification.isNde_value,
            isNdeJustification: classification.justification,
        };
        if (classification.experiencerFullName) {
            classificationUpdate.experiencerFullName = classification.experiencerFullName;
        }
        await supabase
            .from('nde_vids')
            .update(classificationUpdate)
            .eq('videoId', videoId);

        // Gate check: stop if not a profound experience
        if (!classification.is_profound) {
            await updateIntakeStatus(supabase, videoId, 'not_profound');
            logStep('Analysis Gate', 'skipped', 'Not a profound experience — stopping pipeline');
            return {
                status: 'not_profound',
                videoId,
                title: metadata.title || undefined,
                classification,
                steps,
            };
        }

        // ─── Step 9: Run full analysis suite (parallel) ──────────────
        const startAnalysis = Date.now();
        logStep('Full Analysis', 'running', 'Running 7 analysis passes in parallel...');
        await updateIntakeStatus(supabase, videoId, 'analyzing');

        const [greysonResult, transformResult, coreResult, phenResult, journeyResult, cvndeResult, summaryResult] = await Promise.allSettled([
            analyzeGreysonScore(transcripts.punctuated),
            analyzeTransformationScore(transcripts.punctuated),
            analyzeCoreElements(transcripts.punctuated),
            analyzePhenomenologyEntities(transcripts.punctuated),
            analyzeJourneyFlow(transcripts.punctuated),
            analyzeCvndeScore(transcripts.punctuated),
            generateNdeSummary(transcripts.punctuated),
        ]);

        // Extract values from settled promises
        const greyson = greysonResult.status === 'fulfilled' ? greysonResult.value : null;
        const transform = transformResult.status === 'fulfilled' ? transformResult.value : null;
        const core = coreResult.status === 'fulfilled' ? coreResult.value : null;
        const phen = phenResult.status === 'fulfilled' ? phenResult.value : null;
        const journey = journeyResult.status === 'fulfilled' ? journeyResult.value : null;
        const cvnde = cvndeResult.status === 'fulfilled' ? cvndeResult.value : null;
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

        const passResults = [
            greyson ? 'Greyson ✅' : 'Greyson ❌',
            transform ? 'Transformation ✅' : 'Transformation ❌',
            core ? 'Core Elements ✅' : 'Core Elements ❌',
            phen ? 'Phenomenology ✅' : 'Phenomenology ❌',
            journey ? 'Journey Flow ✅' : 'Journey Flow ❌',
            cvnde ? 'cvNDE ✅' : 'cvNDE ❌',
            summary ? 'Summary ✅' : 'Summary ❌',
        ];
        logStep('Full Analysis', 'success', passResults.join(', '), Date.now() - startAnalysis);

        // ─── Step 10: Save analysis to nde_analysis ──────────────────
        const startSave = Date.now();
        await saveAnalysisResults(supabase, videoId, { greyson, transform, core, phen, journey });

        // Save cvNDE and summary to nde_vids (different table)
        await saveCvndeResults(supabase, videoId, cvnde);
        await saveNdeSummary(supabase, videoId, summary);
        logStep('Save Analysis', 'success', 'All passes saved to nde_analysis + nde_vids', Date.now() - startSave);

        // Update isNde based on core elements (more accurate than gate classification)
        if (core) {
            const refinedIsNde = core.experience_type === 'nde' ? 'clear_nde'
                : ['obe', 'sde', 'adc', 'ste'].includes(core.experience_type) ? 'clear_nde'
                    : 'possible_nde';

            await supabase
                .from('nde_vids')
                .update({
                    isNde: refinedIsNde,
                    isNdeJustification: core.summary || classification.justification,
                })
                .eq('videoId', videoId);
        }

        // ─── Step 11: Generate embeddings ────────────────────────────
        const startEmbed = Date.now();
        logStep('Generate Embeddings', 'running');
        await updateIntakeStatus(supabase, videoId, 'indexing');

        await generateEmbeddings(supabase, videoId, transcripts);
        logStep('Generate Embeddings', 'success', 'Search + chat embeddings created', Date.now() - startEmbed);

        // ─── Step 12: Sync to Typesense ──────────────────────────────
        const startTypesense = Date.now();
        logStep('Typesense Index', 'running');
        const indexedCount = await syncToTypesense(supabase, videoId, metadata, transcripts);
        if (indexedCount > 0) {
            logStep('Typesense Index', 'success', `${indexedCount} chunks indexed`, Date.now() - startTypesense);
        } else {
            logStep('Typesense Index', 'skipped', 'Typesense not configured or no chunks');
        }

        // ─── Step 13: Generate fingerprint ───────────────────────────
        if (core) {
            const startFingerprint = Date.now();
            const fingerprint = buildFingerprint({
                core_elements: core.elements,
                intensity_rating: core.intensity_rating,
                overall_tone: core.overall_tone,
                experience_type: core.experience_type,
                trigger_category: core.trigger.category,
            });

            if (fingerprint) {
                // Store fingerprint as pgvector in nde_analysis
                const fpString = `[${fingerprint.join(',')}]`;
                await supabase
                    .from('nde_analysis')
                    .update({ experience_fingerprint: fpString })
                    .eq('video_id', videoId);
                logStep('Generate Fingerprint', 'success', '27-dimension vector created', Date.now() - startFingerprint);
            } else {
                logStep('Generate Fingerprint', 'skipped', 'Insufficient data');
            }
        }

        // ─── Step 14: Mark complete ──────────────────────────────────
        await updateIntakeStatus(supabase, videoId, 'complete');
        logStep('Pipeline Complete', 'success', `Video fully processed`);

        return {
            status: 'complete',
            videoId,
            title: metadata.title || undefined,
            classification,
            analysisSummary: core?.summary || 'Analysis complete',
            steps,
        };

    } catch (error: any) {
        logStep('Pipeline Error', 'failed', error.message);
        return {
            status: 'failed',
            videoId: parseYouTubeUrl(youtubeUrl) || '',
            steps,
            error: error.message,
        };
    }
}

// ─── Helper: Insert Video Record ─────────────────────────────────────────────

async function insertVideoRecord(
    supabase: any,
    videoId: string,
    metadata: VideoMetadata,
    transcripts: ProcessedTranscripts | null,
    isNde: string | null,
    intakeStatus: string,
) {
    const record: Record<string, any> = {
        videoId,
        title: metadata.title,
        description: metadata.description,
        channelId: metadata.channelId,
        channelName: metadata.channelName,
        channelUrl: metadata.channelUrl,
        viewCount: metadata.viewCount,
        likes: metadata.likes,
        commentsCount: metadata.commentsCount,
        duration: metadata.duration,
        date: metadata.date,
        thumbnailUrl: metadata.thumbnailUrl,
        url: metadata.url,
        intake_status: intakeStatus,
        intake_submitted_at: new Date().toISOString(),
    };

    if (isNde) {
        record.isNde = isNde;
    }

    if (transcripts) {
        record.raw_timestamped_subtitles = transcripts.rawTimestamped;
        record.subtitles_punctuated = transcripts.punctuated;
        record.subtitles_cleaned = transcripts.cleaned;
        record.subtitles = transcripts.cleaned; // Legacy field compatibility
    }

    // Use upsert so re-processing updates the existing record
    const { error } = await supabase
        .from('nde_vids')
        .upsert(record, { onConflict: 'videoId' });

    if (error) {
        throw new Error(`Failed to upsert video record: ${error.message}`);
    }
}

// ─── Helper: Update Intake Status ────────────────────────────────────────────

async function updateIntakeStatus(
    supabase: any,
    videoId: string,
    status: string,
    error?: string,
) {
    const update: Record<string, any> = { intake_status: status };
    if (['complete', 'not_profound', 'no_captions', 'failed'].includes(status)) {
        update.intake_completed_at = new Date().toISOString();
    }
    if (error) {
        update.intake_error = error;
    }

    await supabase
        .from('nde_vids')
        .update(update)
        .eq('videoId', videoId);

    // Fire Telegram alert if processing failed and bot/chat are configured
    if (status === 'failed' && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        try {
            const text = `🚨 *Intake Pipeline Failure*\n\n*Video ID*: [${videoId}](https://youtube.com/watch?v=${videoId})\n*Error*: \`${error}\``;
            const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });
        } catch (e) {
            console.error('Failed to send Telegram alert:', e);
        }
    }
}

// ─── Helper: Save Analysis Results ───────────────────────────────────────────

async function saveAnalysisResults(
    supabase: any,
    videoId: string,
    results: {
        greyson: any;
        transform: any;
        core: any;
        phen: any;
        journey: any;
    },
) {
    const { greyson, transform, core, phen, journey } = results;

    const payload: Record<string, any> = {
        video_id: videoId,
    };

    // Greyson
    if (greyson) {
        payload.total_greyson_score = greyson.total_score;
        payload.scale_agreement = greyson.classification;
        payload.greyson_breakdown = greyson.breakdown;
    }

    // Transformation
    if (transform) {
        const score = transform.quantitative_metrics?.overall_transformation_score ?? -1;
        payload.transformation_score = score;
        payload.transformation_classification = classifyTransformationScore(score);
        payload.transformation_breakdown = transform;
    }

    // Core Elements
    if (core) {
        payload.experience_type = core.experience_type;
        payload.experience_type_confidence = core.type_confidence;
        payload.core_elements = core.elements;
        payload.trigger_category = core.trigger?.category;
        payload.trigger_description = core.trigger?.description;
        payload.overall_tone = core.overall_tone;
        payload.intensity_rating = core.intensity_rating;
        payload.content_safety = core.content_safety;
    }

    // Phenomenology & Entities
    if (phen) {
        payload.phenomenology = phen.phenomenology;
        payload.entities = {
            encounters: phen.entities,
            entity_count: phen.entity_count,
            dominant_entity_type: phen.dominant_entity_type,
        };
    }

    // Journey Flow
    if (journey) {
        payload.journey_valid = journey.journey_valid ?? true;
        payload.journey_nde_type = journey.nde_type;
        payload.journey_sequence = journey.sequence;
        payload.journey_notes = journey.notes;
    }

    // Upsert into nde_analysis
    const { data: existing } = await supabase
        .from('nde_analysis')
        .select('video_id')
        .eq('video_id', videoId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('nde_analysis')
            .update(payload)
            .eq('video_id', videoId);
        if (error) throw new Error(`Failed to update analysis: ${error.message}`);
    } else {
        const { error } = await supabase
            .from('nde_analysis')
            .insert(payload);
        if (error) throw new Error(`Failed to insert analysis: ${error.message}`);
    }
}

// ─── Helper: Save cvNDE Results to nde_vids ──────────────────────────────────

async function saveCvndeResults(
    supabase: any,
    videoId: string,
    cvnde: any,
) {
    if (!cvnde) return;

    const update: Record<string, any> = {
        rvnde_total_score: cvnde.total_score,
        rvnde_level: cvnde.level,
        rvnde_summary_reason: cvnde.summary_reason,
        rvnde_details: cvnde.criteria,
        rvnde_status: 'complete',
    };

    const { error } = await supabase
        .from('nde_vids')
        .update(update)
        .eq('videoId', videoId);

    if (error) {
        console.error('Error saving cvNDE results:', error);
    }
}

// ─── Helper: Save NDE Summary to nde_vids ────────────────────────────────────

async function saveNdeSummary(
    supabase: any,
    videoId: string,
    summary: any,
) {
    if (!summary) return;

    const update: Record<string, any> = {
        analysis_nde_summary: summary.nde_summary,
        analysis_status: 'completed',
        analysis_ai_model_used: 'gpt-4o-mini',
        analysis_generated_timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('nde_vids')
        .update(update)
        .eq('videoId', videoId);

    if (error) {
        console.error('Error saving NDE summary:', error);
    }
}

// ─── Helper: Generate Embeddings ─────────────────────────────────────────────

async function generateEmbeddings(
    supabase: any,
    videoId: string,
    transcripts: ProcessedTranscripts,
) {
    const openai = getOpenAIClient();

    // Clean up any existing embeddings first (supports re-processing)
    await supabase.from('nde_punctuated_embeddings').delete().eq('video_id', videoId);
    await supabase.from('nde_chatbot_chunks').delete().eq('video_id', videoId);

    // 1. Search embeddings (nde_punctuated_embeddings) — timestamped chunks
    if (transcripts.searchChunks.length > 0) {
        const searchTexts = transcripts.searchChunks.map(c => c.content);
        const searchEmbeddings = await batchEmbed(openai, searchTexts);

        const searchRows = transcripts.searchChunks.map((chunk, i) => ({
            video_id: videoId,
            content: chunk.content,
            start_time: chunk.start_time,
            embedding: searchEmbeddings[i] ? `[${searchEmbeddings[i].join(',')}]` : null,
        }));

        // Insert 1 row at a time — pgvector rows are ~6KB each; batching triggers Supabase statement timeouts
        for (let i = 0; i < searchRows.length; i++) {
            const { error: searchError } = await supabase
                .from('nde_punctuated_embeddings')
                .insert(searchRows[i]);

            if (searchError) {
                throw new Error(`Failed to insert search embeddings batch ${i}: ${searchError.message}`);
            }
            // Brief pause to avoid overwhelming the connection pool
            if (i < searchRows.length - 1) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`[Intake] Inserted ${searchRows.length} search embedding chunks for ${videoId}`);
    }

    // 2. Chat embeddings (nde_chatbot_chunks) — clean text chunks
    if (transcripts.chatChunks.length > 0) {
        const chatTexts = transcripts.chatChunks.map(c => c.content);
        const chatEmbeddings = await batchEmbed(openai, chatTexts);

        const chatRows = transcripts.chatChunks.map((chunk, i) => ({
            video_id: videoId,
            content: chunk.content,
            embedding: chatEmbeddings[i] ? `[${chatEmbeddings[i].join(',')}]` : null,
            metadata: chunk.metadata,
        }));

        // Insert 1 row at a time — same reason as search embeddings above
        for (let i = 0; i < chatRows.length; i++) {
            const { error: chatError } = await supabase
                .from('nde_chatbot_chunks')
                .insert(chatRows[i]);

            if (chatError) {
                throw new Error(`Failed to insert chat embeddings batch ${i}: ${chatError.message}`);
            }
            if (i < chatRows.length - 1) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`[Intake] Inserted ${chatRows.length} chat embedding chunks for ${videoId}`);
    }

    // 3. Full text embedding for the video itself
    const fullEmbedding = await batchEmbed(openai, [transcripts.cleaned.slice(0, 8000)]);
    if (fullEmbedding[0]) {
        await supabase
            .from('nde_vids')
            .update({
                subtitles_embedding: `[${fullEmbedding[0].join(',')}]`,
                embed_status: 'complete',
                timestamped_embedding_status: 'complete',
            })
            .eq('videoId', videoId);
    }
}

/**
 * Batch generate embeddings using OpenAI's text-embedding-3-small.
 * Handles the API in batches of 100 to stay within rate limits.
 */
async function batchEmbed(openai: OpenAI, texts: string[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const batchSize = 100;

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: batch,
            });

            for (let j = 0; j < response.data.length; j++) {
                results[i + j] = response.data[j].embedding;
            }
        } catch (error) {
            console.error(`Error embedding batch ${i}-${i + batch.length}:`, error);
            // Leave as null — individual failures don't stop the pipeline
        }
    }

    return results;
}

// ─── Helper: Sync Video to Typesense Index ────────────────────────────────────

/**
 * Index this video's search chunks into Typesense for keyword search.
 * Gracefully skips if Typesense is not configured (env vars missing).
 * Returns the number of documents indexed (0 if skipped).
 */
async function syncToTypesense(
    supabase: any,
    videoId: string,
    metadata: VideoMetadata,
    transcripts: ProcessedTranscripts,
): Promise<number> {
    const host = process.env.TYPESENSE_HOST;
    const apiKey = process.env.TYPESENSE_API_KEY;
    const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
    const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);

    if (!host || !apiKey) {
        return 0; // Typesense not configured — skip
    }

    try {
        const typesense = new Typesense.Client({
            nodes: [{ host, port, protocol }],
            apiKey,
            connectionTimeoutSeconds: 10,
        });

        // Fetch the video record for search metadata
        const { data: video } = await supabase
            .from('nde_vids')
            .select('videoId, title, url, thumbnailUrl, date, viewCount, channelName, isNde')
            .eq('videoId', videoId)
            .single();

        if (!video || transcripts.searchChunks.length === 0) return 0;

        const documents = transcripts.searchChunks.map(chunk => ({
            title: video.title || '',
            content: chunk.content,
            videoId: video.videoId,
            channelName: video.channelName || '',
            isNde: video.isNde || 'possible_nde',
            viewCount: video.viewCount || 0,
            date: video.date ? Math.floor(new Date(video.date).getTime() / 1000) : 0,
            thumbnailUrl: video.thumbnailUrl || '',
            url: video.url || '',
            start_time: chunk.start_time,
        }));

        const results = await typesense
            .collections('videos')
            .documents()
            .import(documents, { action: 'upsert', batch_size: 500 });

        const failed = results.filter((r: any) => r.success === false);
        if (failed.length > 0) {
            console.error(`[Intake] Typesense: ${failed.length} docs failed to index`);
        }

        return documents.length - failed.length;
    } catch (error: any) {
        // Non-fatal: search indexing failure shouldn't break the pipeline
        console.error('[Intake] Typesense sync error (non-fatal):', error.message);
        return 0;
    }
}


