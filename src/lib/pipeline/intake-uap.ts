/**
 * UAP Video Intake Pipeline Orchestrator
 * 
 * Copy-Modify from src/lib/pipeline/intake.ts (NDE).
 *
 * Coordinates the end-to-end processing of a single YouTube video for UAP:
 * 1. Parse URL → videoId
 * 2. Check if already in uap_vids
 * 3. Scrape video + channel metadata
 * 4. Shorts gate (≤180s)
 * 5. Ensure channel exists in uap_channels
 * 6. Fetch and process captions
 * 7. Classify (tier/track/content_type) — same as batch classifier
 * 8. Tier 3 gate → stop if out_of_scope
 * 9. Punctuate transcript (reuses punctuate-uap.ts)
 * 10. Generate embeddings (reuses embed-uap.ts)
 * 11. Generate chat chunks
 * 12. Mark complete
 *
 * Key differences from NDE intake.ts:
 * - Writes to uap_vids / uap_channels / uap_punctuated_embeddings / uap_chatbot_chunks
 * - Classification produces tier/track/content_type instead of isNde
 * - Tier 3 gate replaces NDE's "not_profound" gate
 * - UAP triad analysis suite (evidence, contact depth, transformation, summary) runs inline
 * - Contactee profile sync (Step 12.5) uses contactee-sync.ts instead of experiencer-sync.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { parseYouTubeUrl, fetchVideoMetadata, fetchChannelMetadata, type VideoMetadata } from '@/lib/youtube/scraper';
import { fetchCaptions } from '@/lib/youtube/subtitles';
import { processTranscripts, type ProcessedTranscripts } from '@/lib/youtube/transcript-processor';
import { parseIsoDuration } from '@/lib/scanner/discover';
import { syncContacteeProfile } from '@/lib/pipeline/contactee-sync';
import { classifyUapContent } from '@/lib/ai/classify-uap';
import { analyzeUapEvidenceScore } from '@/lib/ai/uap-evidence';
import { analyzeUapContactDepthScore } from '@/lib/ai/uap-contact-depth';
import { analyzeUapTransformationScore } from '@/lib/ai/uap-transformation';
import { generateUapSummary } from '@/lib/ai/uap-summary';
import { analyzeUapPhenomenology } from '@/lib/ai/uap-phenomenology';
import { analyzeUapEncounterContext } from '@/lib/ai/uap-encounter-context';
import { analyzeUapProgramIntel } from '@/lib/ai/uap-program-intel';
import { segmentEncounters, extractEncounterText, deduplicateEncounterNames, type EncounterSegment } from '@/lib/ai/uap-encounter-segment';
import { formatTimestampedTranscript } from '@/lib/ai/format-timestamped-transcript';
import { addTimestampsToProgramIntel, addTimestampsToPhenomenology } from '@/lib/ai/match-quote-timestamp';
import { computeVideoStats, mergeEncounterStats } from '@/lib/pipeline/compute-video-stats';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UapIntakeStatus =
    | 'scraping'
    | 'classifying'
    | 'punctuating'
    | 'analyzing'
    | 'embedding'
    | 'complete'
    | 'failed'
    | 'out_of_scope'
    | 'no_captions'
    | 'caption_fetch_failed'  // Transient Supadata failure (rate limit, timeout, etc.) — retryable
    | 'drm_protected'
    | 'already_exists'
    | 'is_short';

export interface UapIntakeResult {
    status: UapIntakeStatus;
    videoId: string;
    title?: string;
    tier?: number;
    track?: string;
    content_type?: string;
    error?: string;
    steps: UapIntakeStep[];
}

export interface UapIntakeStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    message?: string;
    duration_ms?: number;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

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

// Classification is handled by imported classifyUapContent() from classify-uap.ts
// (see imports above — includes CoT reasoning, few-shot examples, gpt-4o)

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Process a single YouTube video through the full UAP intake pipeline.
 */
export async function processUapVideoIntake(
    youtubeUrl: string,
    onStep?: (step: UapIntakeStep) => void
): Promise<UapIntakeResult> {
    const steps: UapIntakeStep[] = [];
    const supabase = getSupabaseAdmin();

    const logStep = (name: string, status: UapIntakeStep['status'], message?: string, duration_ms?: number) => {
        const step: UapIntakeStep = { name, status, message, duration_ms };
        steps.push(step);
        onStep?.(step);
        console.log(`[UAP Intake] ${status.toUpperCase()}: ${name}${message ? ` — ${message}` : ''}`);
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

        // ─── Step 2: Check if already in uap_vids ────────────────────
        const startCheck = Date.now();
        const { data: existing } = await supabase
            .from('uap_vids')
            .select('video_id, title, tier, intake_status')
            .eq('video_id', videoId)
            .single();

        if (existing) {
            const conclusive: string[] = ['complete', 'out_of_scope', 'is_short'];
            if (conclusive.includes(existing.intake_status ?? '')) {
                const label =
                    existing.intake_status === 'complete' ? `Already processed: "${existing.title}" (Tier ${existing.tier})` :
                        existing.intake_status === 'out_of_scope' ? `Already rejected as out of scope: "${existing.title}"` :
                            `Already filtered as YouTube Short: "${existing.title}"`;
                logStep('Check Database', 'skipped', label, Date.now() - startCheck);
                return {
                    status: 'already_exists',
                    videoId,
                    title: existing.title,
                    tier: existing.tier,
                    steps,
                };
            }
            logStep('Check Database', 'success', `Re-processing (previous status: ${existing.intake_status ?? 'unknown'})`, Date.now() - startCheck);
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
        if (metadata.duration) {
            const durationSecs = parseIsoDuration(metadata.duration);
            if (durationSecs !== null && durationSecs <= 180) {
                logStep('Shorts Gate', 'skipped',
                    `Duration ${durationSecs}s ≤ 180s — YouTube Short, skipping pipeline`);
                await upsertUapVideoRecord(supabase, videoId, metadata, null, 3, 'excluded', 'other', 'is_short');
                return {
                    status: 'is_short',
                    videoId,
                    title: metadata.title || undefined,
                    tier: 3,
                    steps,
                };
            }
        }

        // ─── Step 4: Ensure channel exists in uap_channels ───────────
        if (metadata.channelId) {
            const startChannel = Date.now();
            const { data: existingChannel } = await supabase
                .from('uap_channels')
                .select('channel_id')
                .eq('channel_id', metadata.channelId)
                .single();

            if (!existingChannel) {
                logStep('Enrich Channel', 'running', 'New channel — fetching metadata');
                const channelData = await fetchChannelMetadata(metadata.channelId);
                if (channelData) {
                    const { error: channelError } = await supabase
                        .from('uap_channels')
                        .upsert({
                            channel_id: channelData.channel_id,
                            channel_name: channelData.name,
                            description: channelData.description,
                            avatar_url: channelData.avatar_url,
                            banner_url: channelData.banner_url,
                            custom_url: channelData.custom_url,
                            subscriber_count: channelData.subscriber_count,
                            total_video_count: channelData.total_video_count,
                            total_view_count: channelData.total_view_count,
                            published_at: channelData.published_at,
                            fetched_at: channelData.fetched_at,
                            uploads_playlist_id: channelData.uploads_playlist_id,
                        }, { onConflict: 'channel_id' });
                    if (channelError) {
                        logStep('Enrich Channel', 'failed', channelError.message);
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
        const captionFetch = await fetchCaptions(videoId);

        if (!captionFetch.success) {
            // Detect DRM-protected content (YouTube Movies, paid rentals)
            const drmChannels = ['youtube movies', 'youtube premium'];
            const isDrm = drmChannels.includes((metadata.channelName || '').toLowerCase());

            let captionStatus: UapIntakeStatus;
            if (isDrm) {
                captionStatus = 'drm_protected';
            } else if (captionFetch.retryable) {
                // Transient Supadata failure — mark as failed so it gets retried
                captionStatus = 'caption_fetch_failed';
            } else {
                captionStatus = 'no_captions';
            }

            logStep('Fetch Captions', 'failed',
                `${captionFetch.failureReason}: ${captionFetch.message || 'No details'}`);
            await upsertUapVideoRecord(supabase, videoId, metadata, null, null, null, null, captionStatus);
            return {
                status: captionStatus,
                videoId,
                title: metadata.title || undefined,
                steps,
                error: captionFetch.message,
            };
        }

        const captionResult = captionFetch.data!;
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
        await upsertUapVideoRecord(supabase, videoId, metadata, transcripts, null, null, null, 'classifying');

        // ─── Step 8: Classify (tier/track/content_type) ──────────────
        // Uses classify-uap.ts with CoT reasoning, few-shot examples, and gpt-4o
        const startClassify = Date.now();
        logStep('Classify Content', 'running');

        const classification = await classifyUapContent(
            transcripts.punctuated,
            metadata.title || undefined,
            metadata.description || undefined,
            undefined, // channel title not in metadata object
        );

        if (!classification) {
            logStep('Classify Content', 'failed', 'Classification returned null');
            await updateUapIntakeStatus(supabase, videoId, 'failed', 'Classification returned null');
            return { status: 'failed', videoId, title: metadata.title || undefined, steps, error: 'Classification returned null' };
        }

        logStep('Classify Content', 'success',
            `Tier ${classification.tier} / ${classification.track} / ${classification.content_type} (${classification.confidence}% confidence) [speaker: ${classification.speaker_role}]`,
            Date.now() - startClassify
        );

        // Update classification fields + experiencer_name + source_type
        const experiencerNamesStr = classification.experiencer_names.length > 0
            ? classification.experiencer_names.join(', ')
            : classification.experiencer_name || null;
        await supabase
            .from('uap_vids')
            .update({
                tier: classification.tier,
                track: classification.track,
                content_type: classification.content_type,
                source_type: classification.source_type,
                classified_at: new Date().toISOString(),
                experiencer_name: experiencerNamesStr,
            })
            .eq('video_id', videoId);

        // ─── Step 9: Tier 3 gate ─────────────────────────────────────
        if (classification.tier === 3) {
            await updateUapIntakeStatus(supabase, videoId, 'out_of_scope');
            logStep('Tier 3 Gate', 'skipped', 'Out of scope — stopping pipeline');
            return {
                status: 'out_of_scope',
                videoId,
                title: metadata.title || undefined,
                tier: 3,
                track: classification.track,
                content_type: classification.content_type,
                steps,
            };
        }

        // ─── Step 10: Punctuate ──────────────────────────────────────
        // The transcript was already punctuated by processTranscripts() in Step 6.
        // We already have transcripts.punctuated. Just update the status.
        await supabase
            .from('uap_vids')
            .update({
                subtitles_punctuated: transcripts.punctuated,
                subtitles_cleaned: transcripts.cleaned,
                intake_status: 'punctuated',
            })
            .eq('video_id', videoId);
        logStep('Punctuate Transcript', 'success', 'Transcript punctuated via processTranscripts()');

        // ─── Step 10.5: Dual Analysis Suite (ALL Tier 1 + Tier 2) ────
        // A. Program Intel + Summary run on ALL videos
        // B. Encounter segmentation + per-encounter analysis for encounter content
        if (transcripts.punctuated && (classification.tier === 1 || classification.tier === 2)) {
            const startAnalysis = Date.now();
            await updateUapIntakeStatus(supabase, videoId, 'analyzing');
            const transcript = transcripts.punctuated;

            // Build raw timestamped data reference for deterministic timestamp matching
            const rawTimestamped = transcripts.rawTimestamped;

            // ── A. Program Intel + Summary (ALL videos) ──────────────
            logStep('Analysis: Program Intel + Summary', 'running', 'Running on all Tier 1+2 videos');
            const [programIntelRaw, summaryResult] = await Promise.all([
                analyzeUapProgramIntel(transcript).catch((e: Error) => {
                    logStep('Analysis: Program Intel', 'failed', e.message);
                    return null;
                }),
                generateUapSummary(transcript).catch((e: Error) => {
                    logStep('Analysis: Summary', 'failed', e.message);
                    return null;
                }),
            ]);

            // Post-process: add deterministic timestamps via caption segment matching
            const programIntelResult = programIntelRaw
                ? addTimestampsToProgramIntel(programIntelRaw, rawTimestamped)
                : null;

            // Save program intel to uap_analysis
            const analysisRecord: Record<string, any> = {
                video_id: videoId,
                analysis_model: 'gpt-4o-mini',
                analyzed_at: new Date().toISOString(),
            };
            if (programIntelResult) {
                analysisRecord.program_intel_breakdown = programIntelResult;
            }
            await supabase.from('uap_analysis').upsert(analysisRecord, { onConflict: 'video_id' });

            // Save summary to uap_vids
            if (summaryResult?.uap_summary) {
                await supabase.from('uap_vids')
                    .update({ analysis_uap_summary: summaryResult.uap_summary })
                    .eq('video_id', videoId);
            }
            logStep('Analysis: Program Intel + Summary', 'success',
                `INTEL=${programIntelResult ? '✓' : '—'} SUMMARY=${summaryResult ? '✓' : '—'}`,
                Date.now() - startAnalysis);

            // ── Compute + upsert video aggregate stats ───────────────
            if (programIntelResult) {
                try {
                    const stats = computeVideoStats(videoId, programIntelResult);
                    await supabase.from('uap_video_stats').upsert(stats, { onConflict: 'video_id' });
                    logStep('Video Stats', 'success',
                        `persons=${stats.persons_count} claims=${stats.claims_count} tone=${stats.video_tone}`);
                } catch (statsErr: any) {
                    logStep('Video Stats', 'failed', statsErr.message);
                }
            }

            // ── B. Encounter Analysis (if encounter content detected) ─
            const hasEncounterContent = classification.experiencer_names.length > 0
                || classification.content_type === 'first_person'
                || classification.content_type === 'interview'
                || classification.content_type === 'retold_encounter';

            if (hasEncounterContent) {
                const startEncounters = Date.now();

                // Clear old encounter rows for re-processing
                await supabase.from('uap_encounters').delete().eq('video_id', videoId);

                // Determine encounter segments
                let segments: Array<{
                    experiencer_name: string;
                    encounter_label: string;
                    source_type: 'direct_experiencer' | 'interview_with_experiencer' | 'retold_encounter';
                    text: string;
                    index: number;
                }> = [];

                if (classification.has_multiple_encounters) {
                    // Multi-encounter: run segmentation LLM pass
                    logStep('Encounter Segmentation', 'running', 'Splitting transcript into per-encounter segments');
                    try {
                        const segResult = await segmentEncounters(transcript, classification.experiencer_names, metadata.title || undefined);
                        segments = segResult.encounters.map((seg, i) => ({
                            experiencer_name: seg.experiencer_name,
                            encounter_label: seg.encounter_label,
                            source_type: seg.source_type,
                            text: extractEncounterText(transcript, seg),
                            index: i,
                        }));
                        logStep('Encounter Segmentation', 'success',
                            `${segments.length} encounters: ${segments.map(s => s.experiencer_name).join(', ')}`,
                            Date.now() - startEncounters);
                    } catch (segErr: any) {
                        logStep('Encounter Segmentation', 'failed', segErr.message);
                        // Fallback: single encounter with full transcript
                        segments = [{
                            experiencer_name: classification.experiencer_names[0] || 'Unknown Experiencer',
                            encounter_label: `Encounter described in "${transcripts.searchChunks[0]?.content?.slice(0, 50) || 'video'}"`,
                            source_type: classification.source_type as any || 'retold_encounter',
                            text: transcript,
                            index: 0,
                        }];
                    }
                } else {
                    // Single encounter: use full transcript
                    const srcType = classification.source_type === 'direct_experiencer'
                        || classification.source_type === 'interview_with_experiencer'
                        || classification.source_type === 'retold_encounter'
                        ? classification.source_type
                        : 'retold_encounter';
                    segments = [{
                        experiencer_name: classification.experiencer_names[0] || classification.experiencer_name || 'Unknown Experiencer',
                        encounter_label: `${classification.experiencer_names[0] || 'Experiencer'}'s Encounter`,
                        source_type: srcType as any,
                        text: transcript,
                        index: 0,
                    }];
                }

                // ── Safety Net: Collapse segments with the same experiencer name ─
                // Even if segmenter returns multiple segments for the same person
                // (e.g., 6 events from Isabelle Boivin's life), collapse into one
                // encounter that uses the full transcript for analysis.
                if (segments.length > 1) {
                    const nameGroups = new Map<string, typeof segments>();
                    for (const seg of segments) {
                        const key = seg.experiencer_name.toLowerCase().trim();
                        const group = nameGroups.get(key) || [];
                        group.push(seg);
                        nameGroups.set(key, group);
                    }

                    // If all segments have the same name, collapse to one
                    const uniqueNames = nameGroups.size;
                    if (uniqueNames < segments.length) {
                        const collapsed: typeof segments = [];
                        let idx = 0;
                        for (const [, group] of nameGroups) {
                            if (group.length === 1) {
                                collapsed.push({ ...group[0], index: idx++ });
                            } else {
                                // Merge: use the first segment's metadata but full transcript
                                collapsed.push({
                                    experiencer_name: group[0].experiencer_name,
                                    encounter_label: `${group[0].experiencer_name}'s Encounters`,
                                    source_type: group[0].source_type,
                                    text: transcript, // Use full transcript for merged encounters
                                    index: idx++,
                                });
                                logStep('Collapse Same-Name Encounters', 'success',
                                    `Merged ${group.length} segments for "${group[0].experiencer_name}" into one`);
                            }
                        }
                        segments = collapsed;
                    }
                }

                // ── Name Deduplication (ASR misspelling fix) ─────────
                if (segments.length > 1) {
                    logStep('Name Deduplication', 'running', `Checking ${segments.length} names for ASR duplicates`);
                    try {
                        // Build EncounterSegment-compatible objects for dedup
                        const segmentsForDedup = segments.map(s => ({
                            experiencer_name: s.experiencer_name,
                            encounter_label: s.encounter_label,
                            source_type: s.source_type,
                            start_char_approx: 0,
                            end_char_approx: s.text.length,
                        }));
                        const dedupedSegments = await deduplicateEncounterNames(segmentsForDedup, metadata.title || undefined);
                        
                        if (dedupedSegments.length < segments.length) {
                            // Re-map segments based on deduped names
                            const dedupedNames = new Set(dedupedSegments.map(d => d.experiencer_name));
                            // Keep only first segment per canonical name, merge text from duplicates
                            const mergedSegments: typeof segments = [];
                            for (const deduped of dedupedSegments) {
                                // Find all original segments that match this canonical name
                                const originals = segments.filter(s => {
                                    const nameMatch = s.experiencer_name === deduped.experiencer_name;
                                    if (nameMatch) return true;
                                    // Check if this segment was merged into deduped
                                    return !dedupedNames.has(s.experiencer_name);
                                });
                                
                                // Use the original segment with the most text if found, otherwise use first
                                const best = originals.sort((a, b) => b.text.length - a.text.length)[0] 
                                    || segments[0];
                                mergedSegments.push({
                                    ...best,
                                    experiencer_name: deduped.experiencer_name,
                                    encounter_label: deduped.encounter_label,
                                    source_type: deduped.source_type,
                                    index: mergedSegments.length,
                                });
                            }
                            segments = mergedSegments;
                            logStep('Name Deduplication', 'success', 
                                `Deduped to ${segments.length}: ${segments.map(s => s.experiencer_name).join(', ')}`);
                        } else {
                            logStep('Name Deduplication', 'success', 'No duplicates found');
                        }
                    } catch (dedupErr: any) {
                        logStep('Name Deduplication', 'failed', dedupErr.message);
                        // Continue with original segments
                    }
                }

                // ── Per-encounter analysis loop ─────────────────────
                for (const seg of segments) {
                    const startSeg = Date.now();
                    const runTriad = seg.source_type === 'direct_experiencer'
                        || seg.source_type === 'interview_with_experiencer';

                    logStep(`Encounter: ${seg.experiencer_name}`, 'running',
                        `${runTriad ? 'Phenom + Context + Triad' : 'Phenom + Context only'} (${seg.source_type})`);

                    // Run encounter-specific analyses in parallel
                    const encounterPromises: Promise<any>[] = [
                        analyzeUapPhenomenology(seg.text).catch((e: Error) => {
                            logStep(`Phenom: ${seg.experiencer_name}`, 'failed', e.message);
                            return null;
                        }),
                        analyzeUapEncounterContext(seg.text).catch((e: Error) => {
                            logStep(`Context: ${seg.experiencer_name}`, 'failed', e.message);
                            return null;
                        }),
                    ];

                    // Triad only for direct/interview (not retold)
                    if (runTriad) {
                        encounterPromises.push(
                            analyzeUapEvidenceScore(seg.text).catch((e: Error) => {
                                logStep(`Evidence: ${seg.experiencer_name}`, 'failed', e.message);
                                return null;
                            }),
                            analyzeUapContactDepthScore(seg.text).catch((e: Error) => {
                                logStep(`Contact Depth: ${seg.experiencer_name}`, 'failed', e.message);
                                return null;
                            }),
                            analyzeUapTransformationScore(seg.text).catch((e: Error) => {
                                logStep(`Transformation: ${seg.experiencer_name}`, 'failed', e.message);
                                return null;
                            }),
                        );
                    }

                    const results = await Promise.all(encounterPromises);
                    const [phenomResult, contextResult] = results;
                    const evidenceResult = runTriad ? results[2] : null;
                    const contactDepthResult = runTriad ? results[3] : null;
                    const transformationResult = runTriad ? results[4] : null;

                    // Build uap_encounters row
                    const encounterRow: Record<string, any> = {
                        video_id: videoId,
                        experiencer_name: seg.experiencer_name,
                        source_type: seg.source_type,
                        encounter_label: seg.encounter_label,
                        encounter_index: seg.index,
                        segment_text: seg.text !== transcript ? seg.text : null, // Don't duplicate full transcript
                        analysis_model: 'gpt-4o-mini',
                        analyzed_at: new Date().toISOString(),
                    };

                    // Post-process: add deterministic timestamps via caption segment matching
                    if (phenomResult) {
                        encounterRow.phenomenology_breakdown = addTimestampsToPhenomenology(phenomResult, rawTimestamped);
                        // Promote key classifications to dedicated columns for filtering
                        if (phenomResult.hynek_classification && phenomResult.hynek_classification !== 'unknown') {
                            encounterRow.hynek_type = phenomResult.hynek_classification;
                        }
                    }
                    if (contextResult) encounterRow.encounter_context = contextResult;

                    if (evidenceResult) {
                        encounterRow.evidence_score = evidenceResult.total_score;
                        encounterRow.evidence_breakdown = evidenceResult;
                    }
                    if (contactDepthResult) {
                        encounterRow.contact_depth_score = contactDepthResult.total_score;
                        encounterRow.contact_depth_breakdown = contactDepthResult.breakdown;
                    }
                    if (transformationResult) {
                        encounterRow.transformation_score = transformationResult.quantitative_metrics.full_transformation_score;
                        encounterRow.transformation_breakdown = {
                            quantitative_metrics: transformationResult.quantitative_metrics,
                            domain_analysis: transformationResult.domain_analysis,
                            qualitative_profile: transformationResult.qualitative_profile,
                        };
                    }

                    const { error: encError } = await supabase.from('uap_encounters').insert(encounterRow);
                    if (encError) {
                        logStep(`Encounter: ${seg.experiencer_name}`, 'failed',
                            `DB insert failed: ${encError.message}`, Date.now() - startSeg);
                    } else {
                        const scores = runTriad
                            ? ` ESS=${evidenceResult?.total_score ?? '—'} CDS=${contactDepthResult?.total_score ?? '—'} CTI=${transformationResult?.quantitative_metrics?.full_transformation_score ?? '—'}`
                            : ' (no triad — retold)';
                        logStep(`Encounter: ${seg.experiencer_name}`, 'success',
                            `PHENOM=${phenomResult ? '✓' : '—'} CTX=${contextResult ? '✓' : '—'}${scores}`,
                            Date.now() - startSeg);
                    }
                }

                logStep('Encounter Analysis', 'success',
                    `${segments.length} encounter(s) processed`, Date.now() - startEncounters);

                // ── Merge encounter-level stats into uap_video_stats ─
                try {
                    // Fetch all encounter rows for this video to compute aggregates
                    const { data: encounterRows } = await supabase
                        .from('uap_encounters')
                        .select('evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown')
                        .eq('video_id', videoId);

                    if (encounterRows && encounterRows.length > 0) {
                        const hasCraft = encounterRows.some((r: any) =>
                            r.phenomenology_breakdown?.craft_observation?.observed === true
                        );
                        const dominantEntity = encounterRows[0]?.phenomenology_breakdown?.dominant_entity_type || null;
                        const evidenceScores = encounterRows.map((r: any) => r.evidence_score).filter(Boolean);
                        const contactScores = encounterRows.map((r: any) => r.contact_depth_score).filter(Boolean);
                        const transScores = encounterRows.map((r: any) => r.transformation_score).filter(Boolean);

                        const encounterStats = mergeEncounterStats({ video_id: videoId }, {
                            encounterCount: encounterRows.length,
                            dominantEntityType: dominantEntity,
                            maxEvidenceScore: evidenceScores.length > 0 ? Math.max(...evidenceScores) : null,
                            maxContactDepthScore: contactScores.length > 0 ? Math.max(...contactScores) : null,
                            maxTransformationScore: transScores.length > 0 ? Math.max(...transScores) : null,
                            hasCraftObservation: hasCraft,
                        });
                        await supabase.from('uap_video_stats').upsert(encounterStats, { onConflict: 'video_id' });
                        logStep('Encounter Stats', 'success',
                            `encounters=${encounterRows.length} craft=${hasCraft} entity=${dominantEntity}`);
                    }
                } catch (statsErr: any) {
                    logStep('Encounter Stats', 'failed', statsErr.message);
                }

                // ── Tier Reconciliation ──────────────────────────────
                // The classifier sees only 5K chars and may label a documentary as Tier 2.
                // But the segmenter sees the full transcript and may discover first-person voices.
                // If ANY encounter has a direct/interview source_type, promote to Tier 1.
                const hasFirstPersonVoice = segments.some(s =>
                    s.source_type === 'direct_experiencer' || s.source_type === 'interview_with_experiencer'
                );
                if (hasFirstPersonVoice && classification.tier === 2) {
                    const oldTier = classification.tier;
                    classification.tier = 1;
                    classification.track = 'encounters';
                    classification.content_type = 'interview';
                    
                    // Update experiencer names from segments (more complete than classifier's 5K excerpt)
                    const segNames = segments.map(s => s.experiencer_name).filter(Boolean);
                    if (segNames.length > 0) {
                        classification.experiencer_names = segNames;
                    }
                    const updatedNamesStr = classification.experiencer_names.join(', ');

                    await supabase
                        .from('uap_vids')
                        .update({
                            tier: 1,
                            track: 'encounters',
                            content_type: 'interview',
                            experiencer_name: updatedNamesStr,
                        })
                        .eq('video_id', videoId);

                    logStep('Tier Reconciliation', 'success',
                        `PROMOTED Tier ${oldTier} → Tier 1 (first-person voice detected in ${segments.filter(s => s.source_type === 'direct_experiencer' || s.source_type === 'interview_with_experiencer').length}/${segments.length} encounters)`);
                }

                // ── Multi-Encounter Flag ─────────────────────────────
                // Mark videos with multiple encounters for potential frontier model re-analysis
                const isMulti = segments.length > 1;
                await supabase
                    .from('uap_vids')
                    .update({
                        multi_encounter: isMulti,
                        encounter_count: segments.length,
                    })
                    .eq('video_id', videoId);
                if (isMulti) {
                    logStep('Multi-Encounter Flag', 'success',
                        `Flagged for re-analysis (${segments.length} encounters)`);
                }
            } else {
                logStep('Encounter Analysis', 'skipped', 'No encounter content detected');
            }
        } else if (classification.tier !== 1 && classification.tier !== 2) {
            logStep('Analysis Suite', 'skipped', `Tier ${classification.tier} — analysis only runs for Tier 1 & 2`);
        }

        // ─── Step 11: Generate embeddings ────────────────────────────
        const startEmbed = Date.now();
        logStep('Generate Embeddings', 'running');
        await updateUapIntakeStatus(supabase, videoId, 'embedding');

        await generateUapEmbeddings(supabase, videoId, transcripts);
        logStep('Generate Embeddings', 'success', 'Search + chat embeddings created', Date.now() - startEmbed);

        // ─── Step 12.5: Sync contactee profiles ─────────────────────
        // Sync a profile for each named experiencer (supports multi-encounter)
        if (classification.tier === 1 || classification.content_type === 'retold_encounter') {
            const startSync = Date.now();
            const names = classification.experiencer_names.filter(n =>
                n && !n.startsWith('Unnamed') && !n.startsWith('Anonymous') && !n.startsWith('Witness ')
            );

            if (names.length > 0) {
                logStep('Sync Contactee Profiles', 'running', `${names.length} name(s): ${names.join(', ')}`);
                for (const name of names) {
                    try {
                        const syncResult = await syncContacteeProfile(supabase, name, videoId);
                        logStep(`Contactee: ${name}`, 'success',
                            syncResult.created
                                ? `Created: /uap/experiencer/${syncResult.slug}`
                                : syncResult.updated
                                    ? `Updated: /uap/experiencer/${syncResult.slug} (${syncResult.videoCount} videos)`
                                    : `Exists: /uap/experiencer/${syncResult.slug}`);
                    } catch (syncErr: any) {
                        logStep(`Contactee: ${name}`, 'failed', syncErr.message);
                    }
                }
                logStep('Sync Contactee Profiles', 'success',
                    `${names.length} profile(s) synced`, Date.now() - startSync);
            } else {
                logStep('Sync Contactee Profiles', 'skipped', 'No named experiencers to sync');
            }
        }
        // ─── Step 12.7: Match extracted events to uap_events ─────
        // Link this video's timeline_events to normalized uap_events rows
        {
            const startEventMatch = Date.now();
            try {
                const { data: analysisRow } = await supabase
                    .from('uap_analysis')
                    .select('timeline_events')
                    .eq('video_id', videoId)
                    .maybeSingle();

                const timelineEvents = analysisRow?.timeline_events;
                if (Array.isArray(timelineEvents) && timelineEvents.length > 0) {
                    // Fetch all known events for matching
                    const { data: knownEvents } = await supabase
                        .from('uap_events')
                        .select('id, slug, name, aliases, year, video_ids');

                    if (knownEvents && knownEvents.length > 0) {
                        let matched = 0;
                        for (const te of timelineEvents) {
                            const title = ((te as any)?.title || (te as any)?.event || '').trim().toLowerCase();
                            const teYear = (te as any)?.year || ((te as any)?.date ? parseInt((te as any).date, 10) : null);
                            if (!title) continue;

                            for (const known of knownEvents as any[]) {
                                const allNames = [known.name, ...(known.aliases || [])].map((n: string) => n.toLowerCase());
                                const isMatch = allNames.some((alias: string) =>
                                    title.includes(alias) || alias.includes(title)
                                ) || (teYear === known.year && allNames.some((alias: string) => {
                                    const words = title.split(/\s+/);
                                    return words.filter((w: string) => alias.includes(w)).length >= Math.ceil(words.length * 0.6);
                                }));

                                if (isMatch) {
                                    const currentVids: string[] = known.video_ids || [];
                                    if (!currentVids.includes(videoId)) {
                                        await supabase
                                            .from('uap_events')
                                            .update({
                                                video_ids: [...currentVids, videoId],
                                                updated_at: new Date().toISOString(),
                                            })
                                            .eq('id', known.id);
                                        matched++;
                                    }
                                    break; // Only match each timeline event to one known event
                                }
                            }
                        }
                        logStep('Match Events', 'success',
                            `Matched ${matched} timeline event(s) to known events`, Date.now() - startEventMatch);
                    } else {
                        logStep('Match Events', 'skipped', 'No known events in DB yet');
                    }
                } else {
                    logStep('Match Events', 'skipped', 'No timeline_events in analysis');
                }
            } catch (eventErr: any) {
                logStep('Match Events', 'failed', eventErr.message);
            }
        }

        // ─── Step 13: Mark complete ──────────────────────────────────
        await updateUapIntakeStatus(supabase, videoId, 'complete');
        logStep('Pipeline Complete', 'success', `Video fully processed (Tier ${classification.tier})`);

        return {
            status: 'complete',
            videoId,
            title: metadata.title || undefined,
            tier: classification.tier,
            track: classification.track,
            content_type: classification.content_type,
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

// ─── Helper: Upsert UAP Video Record ─────────────────────────────────────────

async function upsertUapVideoRecord(
    supabase: any,
    videoId: string,
    metadata: VideoMetadata,
    transcripts: ProcessedTranscripts | null,
    tier: number | null,
    track: string | null,
    content_type: string | null,
    intakeStatus: string,
) {
    const record: Record<string, any> = {
        video_id: videoId,
        title: metadata.title,
        description: metadata.description,
        channel_id: metadata.channelId,
        channel_name: metadata.channelName,
        view_count: metadata.viewCount,
        likes: metadata.likes,
        comments_count: metadata.commentsCount,
        duration: metadata.duration,
        date: metadata.date,
        thumbnail_url: metadata.thumbnailUrl,
        url: metadata.url || `https://www.youtube.com/watch?v=${videoId}`,
        intake_status: intakeStatus,
    };

    if (tier !== null) record.tier = tier;
    if (track) record.track = track;
    if (content_type) record.content_type = content_type;

    // Compute publish year for time-series analysis
    if (metadata.date) {
        const year = new Date(metadata.date).getFullYear();
        if (year >= 2000 && year <= 2100) record.video_publish_year = year;
    }

    if (transcripts) {
        record.raw_timestamped_subtitles = transcripts.rawTimestamped;
        record.subtitles_punctuated = transcripts.punctuated;
        record.subtitles_cleaned = transcripts.cleaned;
    }

    const { error } = await supabase
        .from('uap_vids')
        .upsert(record, { onConflict: 'video_id' });

    if (error) {
        throw new Error(`Failed to upsert UAP video record: ${error.message}`);
    }
}

// ─── Helper: Update Intake Status ────────────────────────────────────────────

async function updateUapIntakeStatus(
    supabase: any,
    videoId: string,
    status: string,
    error?: string,
) {
    const update: Record<string, any> = { intake_status: status };
    if (error) {
        update.intake_error = error;
    }

    await supabase
        .from('uap_vids')
        .update(update)
        .eq('video_id', videoId);

    // Telegram alert on failure
    if (status === 'failed' && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        try {
            const text = `🚨 *UAP Intake Pipeline Failure*\n\n*Video ID*: [${videoId}](https://youtube.com/watch?v=${videoId})\n*Error*: \`${error}\``;
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

// ─── Helper: Generate UAP Embeddings ─────────────────────────────────────────

async function generateUapEmbeddings(
    supabase: any,
    videoId: string,
    transcripts: ProcessedTranscripts,
) {
    const openai = getOpenAIClient();

    // Clean up any existing embeddings first (supports re-processing)
    await supabase.from('uap_punctuated_embeddings').delete().eq('video_id', videoId);
    await supabase.from('uap_chatbot_chunks').delete().eq('video_id', videoId);

    // 1. Search embeddings (uap_punctuated_embeddings) — timestamped chunks
    if (transcripts.searchChunks.length > 0) {
        const searchTexts = transcripts.searchChunks.map(c => c.content);
        const searchEmbeddings = await batchEmbed(openai, searchTexts);

        for (let i = 0; i < transcripts.searchChunks.length; i++) {
            const chunk = transcripts.searchChunks[i];
            const { error: searchError } = await supabase
                .from('uap_punctuated_embeddings')
                .insert({
                    video_id: videoId,
                    content: chunk.content,
                    start_time: chunk.start_time,
                    embedding: searchEmbeddings[i] ? `[${searchEmbeddings[i]!.join(',')}]` : null,
                });

            if (searchError) {
                const msg = (searchError.message || '').replace(/\s+/g, ' ').slice(0, 200);
                throw new Error(`Failed to insert UAP search embedding ${i}: ${msg}`);
            }
            if (i < transcripts.searchChunks.length - 1) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`[UAP Intake] Inserted ${transcripts.searchChunks.length} search embedding chunks for ${videoId}`);
    }

    // 2. Chat embeddings (uap_chatbot_chunks) — clean text chunks
    if (transcripts.chatChunks.length > 0) {
        const chatTexts = transcripts.chatChunks.map(c => c.content);
        const chatEmbeddings = await batchEmbed(openai, chatTexts);

        for (let i = 0; i < transcripts.chatChunks.length; i++) {
            const chunk = transcripts.chatChunks[i];
            const { error: chatError } = await supabase
                .from('uap_chatbot_chunks')
                .insert({
                    video_id: videoId,
                    content: chunk.content,
                    embedding: chatEmbeddings[i] ? `[${chatEmbeddings[i]!.join(',')}]` : null,
                    metadata: chunk.metadata,
                });

            if (chatError) {
                throw new Error(`Failed to insert UAP chat embedding ${i}: ${chatError.message}`);
            }
            if (i < transcripts.chatChunks.length - 1) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`[UAP Intake] Inserted ${transcripts.chatChunks.length} chat embedding chunks for ${videoId}`);
    }
}

/**
 * Batch generate embeddings using OpenAI's text-embedding-3-small.
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
        }
    }

    return results;
}
