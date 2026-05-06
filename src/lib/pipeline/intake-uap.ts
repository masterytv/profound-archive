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
 * - No analysis suite (greyson, transformation, etc.) — UAP triad analysis runs separately
 * - No experiencer sync — UAP contactee profiles are separate
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { parseYouTubeUrl, fetchVideoMetadata, fetchChannelMetadata, type VideoMetadata } from '@/lib/youtube/scraper';
import { fetchCaptions } from '@/lib/youtube/subtitles';
import { processTranscripts, type ProcessedTranscripts } from '@/lib/youtube/transcript-processor';
import { parseIsoDuration } from '@/lib/scanner/discover';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UapIntakeStatus =
    | 'scraping'
    | 'classifying'
    | 'punctuating'
    | 'embedding'
    | 'complete'
    | 'failed'
    | 'out_of_scope'
    | 'no_captions'
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

// ─── Classification Prompt (same as uap-batch-classify.ts) ──────────────────

const UAP_CLASSIFY_PROMPT = `You are a content classifier for a UAP (Unidentified Aerial Phenomena) research platform.

Classify this video transcript into one of three tiers:

**Tier 1 — First-Person Encounter Account**
The speaker describes their own personal encounter with UAP/UFOs, aliens, or non-human intelligence.
This includes: close encounters, abductions, contact experiences, channeling sessions where the speaker is the experiencer.
Track: "encounters"

**Tier 2 — Program/Investigative Content** 
Journalism, documentaries, researcher presentations, government disclosure analysis, AATIP/AAWSAP discussion, congressional hearing coverage, expert panels.
Track: "program"

**Tier 3 — Out of Scope**
Entertainment, fiction, debunking without substance, conspiracy theory without evidence, clickbait, unrelated content.
Track: "excluded"

Also classify the content_type:
- "testimony" (Tier 1: direct witness account)
- "interview" (Tier 1: experiencer being interviewed)
- "panel" (Tier 2: expert discussion/panel)
- "documentary" (Tier 2: produced investigative content)
- "news" (Tier 2: news coverage of UAP events)
- "lecture" (Tier 2: academic/researcher presentation)
- "hearing" (Tier 2: government hearing/testimony)
- "commentary" (Tier 2: analysis/commentary on UAP topics)
- "other" (catch-all)

Respond in JSON:
{
  "tier": 1|2|3,
  "track": "encounters"|"program"|"excluded",
  "content_type": "testimony"|"interview"|"panel"|"documentary"|"news"|"lecture"|"hearing"|"commentary"|"other",
  "confidence": 0-100,
  "justification": "Brief explanation"
}`;

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
        const captionResult = await fetchCaptions(videoId);

        if (!captionResult || captionResult.segments.length === 0) {
            logStep('Fetch Captions', 'failed', 'No captions available');
            await upsertUapVideoRecord(supabase, videoId, metadata, null, null, null, null, 'no_captions');
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
        await upsertUapVideoRecord(supabase, videoId, metadata, transcripts, null, null, null, 'classifying');

        // ─── Step 8: Classify (tier/track/content_type) ──────────────
        const startClassify = Date.now();
        logStep('Classify Content', 'running');
        let classification: { tier: number; track: string; content_type: string; confidence: number; justification: string } | null = null;

        try {
            const openai = getOpenAIClient();
            const truncatedText = transcripts.punctuated.slice(0, 12000);
            const userPrompt = `Title: ${metadata.title || 'Unknown'}\nDescription: ${(metadata.description || '').slice(0, 500)}\n\nTranscript:\n${truncatedText}`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: UAP_CLASSIFY_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 500,
            });

            const raw = response.choices[0]?.message?.content || '';
            classification = JSON.parse(raw);
        } catch (e: any) {
            logStep('Classify Content', 'failed', `Classification error: ${e.message}`);
            await updateUapIntakeStatus(supabase, videoId, 'failed', `Classification failed: ${e.message}`);
            return { status: 'failed', videoId, title: metadata.title || undefined, steps, error: `Classification failed: ${e.message}` };
        }

        if (!classification) {
            logStep('Classify Content', 'failed', 'Classification returned null');
            await updateUapIntakeStatus(supabase, videoId, 'failed', 'Classification returned null');
            return { status: 'failed', videoId, title: metadata.title || undefined, steps, error: 'Classification returned null' };
        }

        logStep('Classify Content', 'success',
            `Tier ${classification.tier} / ${classification.track} / ${classification.content_type} (${classification.confidence}% confidence)`,
            Date.now() - startClassify
        );

        // Update classification fields
        await supabase
            .from('uap_vids')
            .update({
                tier: classification.tier,
                track: classification.track,
                content_type: classification.content_type,
                classified_at: new Date().toISOString(),
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

        // ─── Step 11: Generate embeddings ────────────────────────────
        const startEmbed = Date.now();
        logStep('Generate Embeddings', 'running');
        await updateUapIntakeStatus(supabase, videoId, 'embedding');

        await generateUapEmbeddings(supabase, videoId, transcripts);
        logStep('Generate Embeddings', 'success', 'Search + chat embeddings created', Date.now() - startEmbed);

        // ─── Step 12: Mark complete ──────────────────────────────────
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
        like_count: metadata.likes,
        comment_count: metadata.commentsCount,
        duration: metadata.duration,
        published_at: metadata.date,
        thumbnail_url: metadata.thumbnailUrl,
        url: metadata.url || `https://www.youtube.com/watch?v=${videoId}`,
        intake_status: intakeStatus,
    };

    if (tier !== null) record.tier = tier;
    if (track) record.track = track;
    if (content_type) record.content_type = content_type;

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
