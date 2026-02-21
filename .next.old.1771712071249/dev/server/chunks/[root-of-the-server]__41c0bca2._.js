module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/scraper.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * YouTube Video & Channel Metadata Scraper
 * 
 * Centralized module for YouTube API interactions.
 * Handles URL parsing, video metadata fetching, and channel enrichment.
 * 
 * Why: Consolidates YouTube API logic that was previously spread across
 * scripts/enrich-channels.ts and ad-hoc API calls.
 */ // ─── Types ───────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "fetchChannelMetadata",
    ()=>fetchChannelMetadata,
    "fetchVideoMetadata",
    ()=>fetchVideoMetadata,
    "parseYouTubeUrl",
    ()=>parseYouTubeUrl
]);
function parseYouTubeUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    // Pattern 1: youtu.be/VIDEO_ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // Pattern 3: youtube.com/shorts/VIDEO_ID
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    // Pattern 4: youtube.com/embed/VIDEO_ID
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // Pattern 5: youtube.com/v/VIDEO_ID
    const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];
    // Pattern 6: Bare video ID (exactly 11 chars, valid characters)
    const bareMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
    if (bareMatch) return bareMatch[0];
    return null;
}
async function fetchVideoMetadata(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);
    const response = await fetch(url.toString());
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube Videos API error ${response.status}: ${body}`);
    }
    const data = await response.json();
    const items = data.items;
    if (!items || items.length === 0) {
        // Video doesn't exist, is private, or has been removed
        return null;
    }
    const item = items[0];
    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const details = item.contentDetails || {};
    const thumbnails = snippet.thumbnails || {};
    return {
        videoId,
        title: snippet.title || null,
        description: snippet.description || null,
        channelId: snippet.channelId || null,
        channelName: snippet.channelTitle || null,
        channelUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : null,
        channelUsername: null,
        viewCount: stats.viewCount ? parseInt(stats.viewCount, 10) : null,
        likes: stats.likeCount ? parseInt(stats.likeCount, 10) : null,
        commentsCount: stats.commentCount ? parseInt(stats.commentCount, 10) : null,
        duration: details.duration || null,
        date: snippet.publishedAt || null,
        thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null,
        url: `https://www.youtube.com/watch?v=${videoId}`
    };
}
async function fetchChannelMetadata(channelId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY environment variable');
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet,brandingSettings,statistics');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);
    const response = await fetch(url.toString());
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube Channels API error ${response.status}: ${body}`);
    }
    const data = await response.json();
    const items = data.items;
    if (!items || items.length === 0) return null;
    const ch = items[0];
    const snippet = ch.snippet || {};
    const thumbnails = snippet.thumbnails || {};
    const branding = ch.brandingSettings || {};
    const stats = ch.statistics || {};
    const avatar = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null;
    return {
        channel_id: channelId,
        name: snippet.title || 'Unknown',
        description: snippet.description || null,
        avatar_url: avatar,
        banner_url: branding.image?.bannerExternalUrl || null,
        custom_url: snippet.customUrl || null,
        country: snippet.country || null,
        subscriber_count: stats.subscriberCount ? parseInt(stats.subscriberCount, 10) : null,
        total_video_count: stats.videoCount ? parseInt(stats.videoCount, 10) : null,
        total_view_count: stats.viewCount ? parseInt(stats.viewCount, 10) : null,
        published_at: snippet.publishedAt || null,
        fetched_at: new Date().toISOString()
    };
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/subtitles.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * YouTube Subtitle/Caption Fetcher (Apify-powered)
 * 
 * Fetches timestamped captions from YouTube via Apify's YouTube Transcript
 * Scraper actor. This replaced the previous direct-scraping approach because
 * YouTube blocked server-side access to the timedtext XML endpoint in 2025.
 * 
 * Why Apify: YouTube's timedtext API returns empty responses for all 
 * server-side requests (Node.js fetch, https.get, etc.). Apify actors run
 * in real browser environments that bypass this restriction.
 * 
 * Actor: pintostudio/youtube-transcript-scraper
 * Pricing: ~$0.005 per run on Apify free tier (100 runs/month)
 */ // ─── Types ───────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "fetchCaptions",
    ()=>fetchCaptions
]);
// ─── Apify Configuration ────────────────────────────────────────────────────
const APIFY_ACTOR_ID = 'pintostudio~youtube-transcript-scraper';
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const APIFY_TIMEOUT_SECS = 120; // Max wait for actor run
async function fetchCaptions(videoId) {
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
        console.error('Missing APIFY_API_TOKEN environment variable');
        return null;
    }
    try {
        // Step 1: Start the actor run (synchronous — waits for completion)
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[Apify] Starting transcript fetch for ${videoId}...`);
        const runResponse = await fetch(`${APIFY_BASE_URL}/acts/${APIFY_ACTOR_ID}/runs?waitForFinish=${APIFY_TIMEOUT_SECS}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({
                videoUrl
            })
        });
        if (!runResponse.ok) {
            const errorBody = await runResponse.text();
            console.error(`[Apify] Actor run failed (${runResponse.status}):`, errorBody);
            return null;
        }
        const runData = await runResponse.json();
        const runStatus = runData?.data?.status;
        const datasetId = runData?.data?.defaultDatasetId;
        if (runStatus !== 'SUCCEEDED') {
            console.error(`[Apify] Actor run did not succeed. Status: ${runStatus}`);
            return null;
        }
        if (!datasetId) {
            console.error('[Apify] No dataset ID returned from actor run');
            return null;
        }
        // Step 2: Fetch results from the dataset
        const datasetResponse = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items?format=json`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });
        if (!datasetResponse.ok) {
            console.error(`[Apify] Failed to fetch dataset (${datasetResponse.status})`);
            return null;
        }
        const items = await datasetResponse.json();
        // Step 3: Extract transcript segments from the response
        // The actor returns items with a searchResult array
        const segments = extractSegments(items);
        if (segments.length === 0) {
            console.log(`[Apify] No transcript segments found for ${videoId}`);
            return null;
        }
        console.log(`[Apify] Successfully fetched ${segments.length} segments for ${videoId}`);
        return {
            segments,
            language: 'en',
            isAutoGenerated: true
        };
    } catch (error) {
        console.error(`[Apify] Error fetching captions for ${videoId}:`, error);
        return null;
    }
}
// ─── Internal Helpers ────────────────────────────────────────────────────────
/**
 * Extract CaptionSegment[] from Apify dataset items.
 * 
 * The Pinto Studio actor returns data in this format:
 * [{ searchResult: [{ start: "0.320", dur: "4.080", text: "..." }, ...] }]
 * 
 * We also handle potential variations in the response shape.
 */ function extractSegments(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
    }
    const segments = [];
    for (const item of items){
        // Primary format: { data: [...] } (confirmed from pintostudio actor)
        // Also handle alternate formats: { searchResult: [...] }, { transcript: [...] }
        const results = item.data || item.searchResult || item.transcript || item.captions || [];
        if (Array.isArray(results)) {
            for (const entry of results){
                const start = parseFloat(entry.start);
                const duration = parseFloat(entry.dur || entry.duration || '0');
                const text = decodeHtmlEntities((entry.text || '').trim());
                if (text && !isNaN(start)) {
                    segments.push({
                        text,
                        start,
                        duration: isNaN(duration) ? 0 : duration
                    });
                }
            }
        }
    }
    return segments;
}
/**
 * Decode common HTML entities found in YouTube caption text.
 */ function decodeHtmlEntities(text) {
    return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/\n/g, ' ').trim();
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/transcript-processor.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Transcript Processor
 * 
 * Transforms raw YouTube caption segments into the various formats
 * needed by the application:
 * 
 * 1. raw_timestamped_subtitles   → Raw JSON for timestamped search
 * 2. subtitles_punctuated        → Clean full text for AI analysis
 * 3. subtitles_cleaned           → Plain text without timestamps for chat
 * 4. Search chunks               → ~500 char chunks with start_time for nde_punctuated_embeddings
 * 5. Chat chunks                 → ~1000 char chunks without timestamps for nde_chatbot_chunks
 */ __turbopack_context__.s([
    "processTranscripts",
    ()=>processTranscripts
]);
function processTranscripts(segments, videoId) {
    // 1. Full punctuated text — join all segment text with spaces
    const punctuated = segments.map((s)=>s.text).join(' ').replace(/\s+/g, ' ').trim();
    // 2. Cleaned text is the same as punctuated for our purposes
    // (YouTube captions don't have timestamps in the text itself)
    const cleaned = punctuated;
    // 3. Search chunks — smaller chunks (~500 chars) preserving timestamp alignment
    const searchChunks = createSearchChunks(segments, 500);
    // 4. Chat chunks — larger chunks (~1000 chars) from the clean text
    const chatChunks = createChatChunks(cleaned, videoId, 1000);
    return {
        rawTimestamped: segments,
        punctuated,
        cleaned,
        searchChunks,
        chatChunks
    };
}
// ─── Chunking Logic ──────────────────────────────────────────────────────────
/**
 * Create search-optimized chunks that preserve timestamp alignment.
 * Each chunk maps to a specific point in the video.
 * 
 * Strategy: Accumulate segments until we hit ~targetSize characters,
 * then start a new chunk. Each chunk's start_time is the first segment's start.
 */ function createSearchChunks(segments, targetSize = 500) {
    const chunks = [];
    let currentText = '';
    let currentStart = 0;
    for (const segment of segments){
        if (currentText.length === 0) {
            currentStart = segment.start;
        }
        currentText += (currentText ? ' ' : '') + segment.text;
        // When we've accumulated enough text, emit a chunk
        if (currentText.length >= targetSize) {
            chunks.push({
                content: currentText.trim(),
                start_time: currentStart
            });
            currentText = '';
        }
    }
    // Don't forget the last chunk
    if (currentText.trim()) {
        chunks.push({
            content: currentText.trim(),
            start_time: currentStart
        });
    }
    return chunks;
}
/**
 * Create chat-optimized chunks from clean text.
 * These are used for RAG retrieval in the compassionate chat.
 * 
 * Strategy: Split on sentence boundaries near the target size.
 * Overlap by ~100 chars to preserve context across chunk boundaries.
 */ function createChatChunks(text, videoId, targetSize = 1000) {
    const chunks = [];
    const overlap = 100;
    let position = 0;
    let chunkIndex = 0;
    while(position < text.length){
        let end = Math.min(position + targetSize, text.length);
        // Try to break at a sentence boundary (. ! ? followed by space)
        if (end < text.length) {
            const searchRange = text.substring(end - 100, end + 50);
            const sentenceBreak = searchRange.lastIndexOf('. ');
            if (sentenceBreak > 0) {
                end = end - 100 + sentenceBreak + 2; // +2 to include ". "
            }
        }
        const content = text.substring(position, end).trim();
        if (content) {
            chunks.push({
                content,
                metadata: {
                    video_id: videoId,
                    chunk_index: chunkIndex,
                    char_start: position,
                    char_end: end
                }
            });
            chunkIndex++;
        }
        // Move forward, with overlap for context continuity
        position = end - overlap;
        if (position >= text.length - overlap) break; // Prevent infinite loop on tiny remainders
    }
    return chunks;
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/classify-experience.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "classifyExperience",
    ()=>classifyExperience
]);
/**
 * Experience Classification Gate
 * 
 * Lightweight AI pre-screen to determine if a video contains a genuine
 * profound experience (NDE, OBE, STE, etc.) before running expensive
 * analysis passes (Greyson, Transformation, etc.).
 * 
 * Also extracts the experiencer's full name when identifiable.
 * 
 * Why this exists: Running all 7 analysis passes costs ~$0.02-0.05 per video
 * in API calls and ~30s of processing time. This gate costs ~$0.001 and
 * takes ~2s, filtering out non-NDE content early.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// ─── Prompt ──────────────────────────────────────────────────────────────────
const CLASSIFICATION_PROMPT = `You are an expert classifier of near-death and related experiences.

Given a video transcript, determine if it contains a FIRST-PERSON ACCOUNT of a profound experience.

Qualifying experience types:
- NDE (Near-Death Experience): Person was clinically dead or in a life-threatening crisis
- OBE (Out-of-Body Experience): Person perceived themselves outside their physical body
- SDE (Shared Death Experience): Person shared in another's dying/transition experience
- ADC (After-Death Communication): Person received communication from a deceased individual
- STE (Spiritually Transformative Experience): Mystical/transcendent experience without death proximity

NOT qualifying (mark as not profound):
- Discussions ABOUT NDEs without a first-person account
- Documentary narration without experiencer testimony
- Guided meditations, hypnosis recordings
- Fiction, creepypasta, or entertainment content
- News reports about NDEs without experiencer accounts
- Book reviews or academic lectures about NDEs
- Interviews where the host discusses NDEs but the guest doesn't share their own experience

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "is_profound": true/false,
  "experience_type": "nde" | "obe" | "sde" | "adc" | "ste" | "none",
  "confidence": 0-100,
  "justification": "1-2 sentence explanation",
  "experiencerFullName": "Full Name" | null
}

EXPERIENCER NAME RULES:
- Extract the FULL NAME (first and last) of the person who EXPERIENCED the NDE.
- DO NOT return the name of the host, interviewer, narrator, podcaster, or commentator.
- DO NOT return the name of someone describing another person's NDE secondhand.
- Look for self-identification ("My name is Jane Doe"), host introductions ("Welcome, Jane Doe"), or names in the video title/description.
- If only a first name is clearly identifiable as the experiencer, return just the first name.
- If no name is identifiable, or the content is not an NDE, return null.

SCORING RULES:
- confidence >= 70 with is_profound=true → clear_nde
- confidence 40-69 with is_profound=true → possible_nde  
- is_profound=false → not_nde
- transcript too short or unclear → insufficient_info (set confidence < 20)`;
// ─── Classifier ──────────────────────────────────────────────────────────────
// Lazy init to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
async function classifyExperience(transcript, title, description) {
    if (!transcript || transcript.length < 50) {
        return {
            is_profound: false,
            experience_type: 'none',
            confidence: 0,
            justification: 'Transcript too short to classify',
            isNde_value: 'insufficient_info',
            experiencerFullName: null
        };
    }
    // Only need the beginning to classify — saves tokens
    const truncated = transcript.slice(0, 15000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: CLASSIFICATION_PROMPT
                },
                {
                    role: 'user',
                    content: [
                        title ? `Video Title: "${title}"` : '',
                        description ? `Video Description: "${description.slice(0, 500)}"` : '',
                        `\nClassify this video transcript:\n\n${truncated}`
                    ].filter(Boolean).join('\n\n')
                }
            ],
            response_format: {
                type: 'json_object'
            },
            temperature: 0.1,
            max_tokens: 200
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        // Map to database enum
        let isNde_value;
        if (!result.is_profound) {
            isNde_value = 'not_nde';
        } else if (result.confidence < 20) {
            isNde_value = 'insufficient_info';
        } else if (result.confidence >= 70) {
            isNde_value = 'clear_nde';
        } else {
            isNde_value = 'possible_nde';
        }
        return {
            is_profound: result.is_profound,
            experience_type: result.experience_type || 'none',
            confidence: result.confidence || 0,
            justification: result.justification || '',
            isNde_value,
            experiencerFullName: result.experiencerFullName || null
        };
    } catch (error) {
        console.error('Error in classifyExperience:', error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/greyson.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GREYSON_ANALYSIS_PROMPT",
    ()=>GREYSON_ANALYSIS_PROMPT,
    "analyzeGreysonScore",
    ()=>analyzeGreysonScore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Initialize OpenAI client
// Note: In server-side contexts, we can instantiate this here.
// In edge functions, we might need to instantiate inside the function.
// Initialize OpenAI client lazily
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const GREYSON_ANALYSIS_PROMPT = `You are an expert NDE researcher. Analyze the following NDE account using the Greyson NDE Scale.
The scale has 16 items across 4 categories. Each item is scored 0 (not present), 1 (mildly or ambiguously present), or 2 (definitely present).

The 4 categories and their items are:
1. Cognitive:
   - Time distortion (time seemed to speed up or slow down)
   - Thought speed (thoughts were speeded up)
   - Life review (scenes from the past came back)
   - Sudden understanding (suddenly seemed to understand everything)

2. Affective:
   - Peace/Pleasantness (feeling of peace or pleasantness)
   - Joy (feeling of joy)
   - Cosmic Unity (sense of harmony or unity with the universe)
   - Brilliant Light (saw or felt surrounded by a brilliant light)

3. Paranormal:
   - Enhanced Senses (senses were more vivid than usual)
   - ESP (seemed to be aware of things going on elsewhere)
   - Precognition (scenes from the future came to you)
   - Out of Body (felt separated from the body)

4. Transcendental:
   - Unearthly World (seemed to enter some other, unearthly world)
   - Mystical Being (seemed to encounter a mystical being or presence)
   - Spirits/Deceased (saw deceased or religious spirits)
   - Border/Point of no return (came to a border or point of no return)

Analyze the following account and provide a score for each item. Format your response as a JSON object strictly adhering to the schema below.

Output JSON Schema:
{
  "total_score": number, // Sum of all 16 items
  "classification": string, // "Not NDE" (0-6), "Mild NDE" (7-12), "Moderate NDE" (13-20), "Deep NDE" (21-32)
  "breakdown": {
    "cognitive": {
      "time_distortion": { "score": 0|1|2, "reasoning": "string (brief quote or explanation)" },
      "thought_speed": { "score": 0|1|2, "reasoning": "string" },
      "life_review": { "score": 0|1|2, "reasoning": "string" },
      "sudden_understanding": { "score": 0|1|2, "reasoning": "string" }
    },
    "affective": {
      "peace_pleasantness": { "score": 0|1|2, "reasoning": "string" },
      "joy": { "score": 0|1|2, "reasoning": "string" },
      "cosmic_unity": { "score": 0|1|2, "reasoning": "string" },
      "brilliant_light": { "score": 0|1|2, "reasoning": "string" }
    },
    "paranormal": {
      "enhanced_senses": { "score": 0|1|2, "reasoning": "string" },
      "esp": { "score": 0|1|2, "reasoning": "string" },
      "precognition": { "score": 0|1|2, "reasoning": "string" },
      "out_of_body": { "score": 0|1|2, "reasoning": "string" }
    },
    "transcendental": {
      "unearthly_world": { "score": 0|1|2, "reasoning": "string" },
      "mystical_being": { "score": 0|1|2, "reasoning": "string" },
      "spirits_deceased": { "score": 0|1|2, "reasoning": "string" },
      "border_point_no_return": { "score": 0|1|2, "reasoning": "string" }
    }
  }
}`;
async function analyzeGreysonScore(subtitles) {
    if (!subtitles) return null;
    // Truncate to avoid token limits if necessary, though 4o-mini handles 128k context.
    // A safe limit of 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: GREYSON_ANALYSIS_PROMPT
                },
                {
                    role: "user",
                    content: `Input Text:\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.1
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        return result;
    } catch (error) {
        console.error("Error in analyzeGreysonScore:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/transformation.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TRANSFORMATION_ANALYSIS_PROMPT",
    ()=>TRANSFORMATION_ANALYSIS_PROMPT,
    "analyzeTransformationScore",
    ()=>analyzeTransformationScore,
    "classifyTransformationScore",
    ()=>classifyTransformationScore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const TRANSFORMATION_ANALYSIS_PROMPT = `You are an academic researcher specializing in near-death experience (NDE) aftereffects and transformation. You will analyze a punctuated transcript of a first-person NDE account and score it using the NDE Transformation Index (NDE-TI), a 10-domain scale measuring the transformation described by the experiencer as resulting from their NDE.

IMPORTANT INSTRUCTIONS:
1. Score ONLY what is described or clearly implied in the account. Do not infer transformation that is not mentioned.
2. A score of 0 means the domain was NOT DISCUSSED in this account - it does NOT mean no change occurred.
3. Assess the DEGREE OF CHANGE from the person's own described baseline, not against an external standard.
4. Capture the DIRECTION of change using indicators: up (increased), down (decreased), mixed (mixed/complex), shifted (shifted/redirected), new (newly emerged), or N/A.
5. Provide a brief EVIDENCE SUMMARY and a representative QUOTE for each domain scored >= 1.
6. Be faithful to the experiencer's own words and framing. Do not pathologize, judge, or reinterpret their experience.
7. Note: Many NDE video transcripts focus primarily on the NDE experience itself rather than aftereffects. Low transformation scores are expected and normal in such cases.

SCORING SCALE FOR EACH DOMAIN (0-5):
- 0: Not Addressed - This area of transformation is not discussed in the account.
- 1: Briefly Noted - A passing mention or slight implication of change.
- 2: Mild Change - A noticeable shift is described, with limited detail.
- 3: Moderate Change - A clear, meaningful transformation is described with specific examples or detail.
- 4: Significant Change - A major, life-altering transformation is described in detail; clearly important to the experiencer.
- 5: Profound Transformation - A dramatic, fundamental, life-defining change described with vivid detail and emotional emphasis; central to the account.

THE 10 DOMAINS:
1. Appreciation for Life (AL): Changes in gratitude, wonder, savoring ordinary moments, awareness of beauty, feeling life is precious. (Typical direction: up)
2. Self-Perception & Identity (SI): Changes in self-acceptance, self-worth, inner peace, confidence, personality traits, sense of being a "different person." (Typical direction: up)
3. Compassion & Concern for Others (CC): Changes in empathy, desire to help/serve, tolerance, unconditional love, sensitivity to others' feelings. (Typical direction: up)
4. Values & Priorities (VP): Changes in materialism, status-seeking, competition, simplicity, authenticity, what the person considers most important. (Typical direction: down materialism, up simplicity)
5. Spiritual Awareness (SA): Changes in sense of connection to the divine, universal consciousness, oneness, spiritual practices. Distinct from organized religion. (Typical direction: up)
6. Religious Orientation (RO): Changes in relationship with organized religion, doctrines, institutional participation, faith tradition. Can move in ANY direction. (Directions: up, down, shifted, mixed)
7. Attitude Toward Death (AD): Changes in fear of death, belief in afterlife, death as transition/homecoming, comfort with mortality. (Typical direction: down fear, up belief/comfort)
8. Psychic & Expanded Perception (PE): Emergence or increase of intuition, precognition, telepathy, healing abilities, mediumship, OBEs, synchronicities, electromagnetic sensitivity. (Typical direction: up)
9. Relationships & Social Dynamics (RS): Changes in intimate partnerships, friendships, family dynamics, feelings of alienation, need for deep connection. (Typical direction: mixed)
10. Purpose, Meaning & Life Direction (PD): Changes in life purpose, mission, career path, thirst for knowledge, desire to serve, meaningful work. (Typical direction: up)

OUTPUT FORMAT - Respond with ONLY valid JSON matching this schema exactly:

{
  "quantitative_metrics": {
    "overall_transformation_score": <number 0-50>,
    "transformation_breadth": <number 0-10, count of domains scoring >= 1>,
    "transformation_depth": <number 1.0-5.0, mean of domains scoring >= 1, or 0 if no domains scored>
  },
  "domain_analysis": {
    "AL": { "name": "Appreciation for Life", "score": <0-5>, "direction": "<up|down|mixed|shifted|new|N/A>", "evidence_summary": "<brief explanation>", "key_quote": "<direct quote or empty string>" },
    "SI": { "name": "Self-Perception & Identity", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "CC": { "name": "Compassion & Concern for Others", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "VP": { "name": "Values & Priorities", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "SA": { "name": "Spiritual Awareness", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "RO": { "name": "Religious Orientation", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "AD": { "name": "Attitude Toward Death", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "PE": { "name": "Psychic & Expanded Perception", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "RS": { "name": "Relationships & Social Dynamics", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "PD": { "name": "Purpose, Meaning & Life Direction", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" }
  },
  "qualitative_profile": {
    "dominant_themes": ["<Theme 1>", "<Theme 2>", "<Theme 3>"],
    "integration_notes": "<Observations on difficulty/ease of integrating changes>",
    "timeline_notes": "<Immediate vs gradual, time since NDE if mentioned>",
    "unique_features": "<Any distinctive aspects of this transformation>"
  }
}`;
function classifyTransformationScore(score) {
    if (score === 0) return 'No Transformation Discussed';
    if (score <= 10) return 'Minimal Transformation';
    if (score <= 20) return 'Moderate Transformation';
    if (score <= 30) return 'Significant Transformation';
    if (score <= 40) return 'Major Transformation';
    return 'Comprehensive Profound Transformation';
}
async function analyzeTransformationScore(subtitles) {
    if (!subtitles) return null;
    // Truncate to avoid token limits. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos and keeps costs reasonable.
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: TRANSFORMATION_ANALYSIS_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze the following NDE account transcript:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.1
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        return result;
    } catch (error) {
        console.error("Error in analyzeTransformationScore:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/core-elements.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CORE_ELEMENTS_PROMPT",
    ()=>CORE_ELEMENTS_PROMPT,
    "analyzeCoreElements",
    ()=>analyzeCoreElements
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const CORE_ELEMENTS_PROMPT = `You are an expert analyst of near-death experiences (NDEs) and out-of-body experiences (OBEs), specializing in video transcript analysis.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "experience_type": "nde" | "obe" | "sde" | "adc" | "ste" | "dream" | "meditation" | "other",
  "type_confidence": 0-100,
  "summary": "2-3 sentence summary of the experience itself",
  "elements": [
    {"name": "out_of_body", "present": true/false, "confidence": 0-100, "quote": "supporting quote from transcript or empty string"},
    {"name": "tunnel", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "bright_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "deceased_relatives", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "life_review", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "being_of_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "border_boundary", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "feelings_of_peace", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "cosmic_unity", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "time_distortion", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "enhanced_senses", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "telepathy", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "otherworldly_realm", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "knowledge_download", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "choice_to_return", "present": true/false, "confidence": 0-100, "quote": ""}
  ],
  "trigger": {
    "category": "medical_crisis" | "accident" | "surgery" | "illness" | "cardiac_arrest" | "near_drowning" | "childbirth" | "combat" | "suicide_attempt" | "overdose" | "allergic_reaction" | "spontaneous" | "other" | "unknown",
    "description": "brief description of what caused the experience"
  },
  "overall_tone": "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | "mixed",
  "intensity_rating": 1-10,
  "content_safety": {
    "overall_safe": true/false,
    "flags": {
      "suicide_related": true/false,
      "self_harm": true/false,
      "distressing_content": true/false,
      "medical_graphic": true/false,
      "child_death": true/false
    },
    "warning_level": "none" | "mild" | "moderate" | "severe"
  }
}

Experience type definitions:
- nde: Near-death experience (clinical death, life-threatening crisis)
- obe: Out-of-body experience (no life-threatening situation)
- sde: Shared death experience (witnessed another's death, shared their transition)
- adc: After-death communication (contact from deceased person, not during crisis)
- ste: Spiritually transformative experience (mystical, no death proximity)
- dream: Dream or lucid dream
- meditation: During meditation practice
- other: Does not fit above categories

Element definitions:
- out_of_body: Perceived from outside the physical body
- tunnel: Entered or traveled through a tunnel
- bright_light: Encountered brilliant or supernatural light
- deceased_relatives: Met dead family members or friends
- life_review: Reviewed life events, saw life flash
- being_of_light: Encountered a distinct, powerful light being
- border_boundary: Reached a barrier or point of no return
- feelings_of_peace: Overwhelming peace, absence of pain
- cosmic_unity: Felt one with everything
- time_distortion: Time stopped, sped up, or became meaningless
- enhanced_senses: Heightened perception, vivid colors, clarity
- telepathy: Communication without words
- otherworldly_realm: Being in another dimension or realm
- knowledge_download: Received universal knowledge or understanding
- choice_to_return: Given choice to stay or return

Scoring rules:
- Only mark elements as present if clearly described or strongly implied
- Confidence reflects how explicitly the element was described (100 = verbatim, 50 = implied)
- Quotes should be short (under 30 words) and from the experiencer only
- For trigger: if unknown or not mentioned, use "unknown"
- For content safety: only flag if CLEARLY present. When in doubt, do NOT flag.`;
async function analyzeCoreElements(subtitles) {
    if (!subtitles) return null;
    // Truncate to keep costs reasonable. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: CORE_ELEMENTS_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze this NDE video transcript:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.2
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        return result;
    } catch (error) {
        console.error("Error in analyzeCoreElements:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/phenomenology-entities.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PHENOMENOLOGY_ENTITIES_PROMPT",
    ()=>PHENOMENOLOGY_ENTITIES_PROMPT,
    "analyzePhenomenologyEntities",
    ()=>analyzePhenomenologyEntities
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const PHENOMENOLOGY_ENTITIES_PROMPT = `You are an expert analyst of near-death experiences (NDEs), specializing in phenomenological quality assessment and entity encounter documentation from video transcript analysis.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "phenomenology": {
    "reality_comparison": "more_real" | "equally_real" | "dreamlike" | "surreal" | "not_stated",
    "reality_quote": "supporting quote or empty string",
    "vividness_rating": 1-10,
    "vividness_quote": "supporting quote or empty string",
    "sensory_modalities": {
      "visual": {"active": true/false, "description": "brief description of visual experiences", "extraordinary": true/false},
      "auditory": {"active": true/false, "description": "music, voices, sounds described", "extraordinary": true/false},
      "tactile": {"active": true/false, "description": "touch, temperature, physical sensations", "extraordinary": true/false},
      "olfactory": {"active": true/false, "description": "smells described", "extraordinary": true/false},
      "gustatory": {"active": true/false, "description": "taste experiences", "extraordinary": true/false},
      "kinesthetic": {"active": true/false, "description": "movement, flying, floating sensations", "extraordinary": true/false}
    },
    "emotional_progression": [
      {"emotion": "string", "intensity": 1-10, "context": "brief context of when this emotion occurred"}
    ],
    "altered_cognition": {
      "thought_clarity": "enhanced" | "normal" | "diminished" | "not_stated",
      "thought_speed": "faster" | "normal" | "slower" | "timeless" | "not_stated",
      "memory_quality": "perfect_recall" | "vivid" | "partial" | "fragmentary" | "not_stated",
      "self_awareness": "heightened" | "normal" | "diminished" | "dissolved" | "not_stated"
    },
    "distinguishing_features": "1-2 sentence summary of what makes THIS experience phenomenologically unique"
  },
  "entities": [
    {
      "order": 1,
      "identity": "specific name or relation (e.g. 'grandmother', 'Jesus', 'unknown being') or 'unidentified'",
      "entity_type": "deceased_relative" | "deceased_friend" | "religious_figure" | "angel" | "guide" | "being_of_light" | "shadow_figure" | "animal" | "group" | "unknown",
      "appearance": "physical description if given, or 'not described'",
      "gender": "male" | "female" | "androgynous" | "non_physical" | "not_stated",
      "age_appearance": "young" | "middle_aged" | "elderly" | "ageless" | "not_stated",
      "luminosity": "radiant" | "glowing" | "normal" | "dark" | "not_stated",
      "communication_method": "telepathy" | "verbal" | "gesture" | "emotional" | "presence_only" | "not_stated",
      "message_summary": "key message conveyed, or 'none'",
      "message_quote": "direct quote of message from transcript, or empty string",
      "emotional_quality": "loving" | "peaceful" | "authoritative" | "playful" | "stern" | "frightening" | "neutral" | "mixed",
      "confidence": 0-100
    }
  ],
  "entity_count": 0,
  "dominant_entity_type": "the most significant entity type encountered, or 'none'"
}

EXTRACTION RULES:

Phenomenology:
- reality_comparison: Look for phrases like "more real than real", "realer than this", "like a dream", "crystal clear"
- vividness_rating: 10 = indescribable clarity/beauty, 1 = vague/fuzzy, based on descriptive language used
- sensory_modalities: "extraordinary" means beyond normal human capacity (360-degree vision, seeing through walls, etc.)
- emotional_progression: Extract in chronological order of the experience, minimum 2, maximum 6 emotions
- altered_cognition: Only fill if the experiencer explicitly comments on their thought processes

Entities:
- Extract ALL distinct entities mentioned, in order of appearance during the experience
- If a "group" is mentioned (crowd, many beings), count as one entity with type "group"
- message_quote should be the experiencer's direct words, under 40 words
- Do NOT infer entities that aren't clearly described — only extract what's explicitly stated
- If no entities were encountered, return an empty array and entity_count: 0
- confidence: how clearly this entity was described (100 = vivid detail, 50 = briefly mentioned)`;
async function analyzePhenomenologyEntities(subtitles) {
    if (!subtitles) return null;
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: PHENOMENOLOGY_ENTITIES_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze the phenomenological quality and entity encounters in this NDE video transcript:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.2
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        return result;
    } catch (error) {
        console.error("Error in analyzePhenomenologyEntities:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/journey-flow.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JOURNEY_FLOW_PROMPT",
    ()=>JOURNEY_FLOW_PROMPT,
    "analyzeJourneyFlow",
    ()=>analyzeJourneyFlow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const JOURNEY_FLOW_PROMPT = `You are an expert NDE researcher analyzing a video transcript to extract the
CHRONOLOGICAL SEQUENCE of phenomenological elements from a near-death or
out-of-body experience.

CONTEXT: This is a punctuated transcript from a YouTube video. The experiencer
may describe events non-linearly (common in spoken accounts). Reconstruct the
chronological order of the EXPERIENCE ITSELF, not the order it was told.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

ELEMENT TAXONOMY (25 elements across 6 phases):

PHASE 1 — Initial Transition (first element should be from here):
- observing_body: Seeing own physical body/scene from external viewpoint
- void_darkness: Entering complete darkness, void, nothingness
- tunnel: Entering or traveling through a tunnel
- bright_light: Immediately encountering brilliant light

PHASE 2 — Emotional/Sensory States (can occur anytime):
- peace_calm: Overwhelming peace, tranquility, absence of pain
- joy_bliss: Intense positive emotions, ecstasy
- love_unconditional: Feeling completely loved, accepted
- fear_distress: Fear, terror, distress
- enhanced_senses: Vivid colors, clarity, 360-degree vision
- celestial_music: Otherworldly music, harmonies, voices
- time_distortion: Time stops or becomes meaningless

PHASE 3 — Encounters:
- deceased_relatives: Meeting specific dead family/friends
- beings_entities: Meeting beings, angels, guides (not recognized as deceased)
- being_of_light: Meeting THE being of light — powerful, loving presence
- religious_figure: Meeting Jesus, God, Buddha, or named religious figure
- unknown_presence: Sensing a presence without seeing it clearly

PHASE 4 — Realm/Environment:
- otherworldly_realm: Another dimension, heaven-like place
- hellish_realm: Frightening, dark, hellish environment
- cities_structures: Buildings, cities of light, crystalline structures
- nature_landscapes: Gardens, fields, mountains, meadows, water

PHASE 5 — Transformative Experiences:
- life_review: Reviewing life events, experiencing others' perspectives
- knowledge_download: Receiving universal knowledge, understanding everything
- cosmic_unity: Feeling one with everything, interconnected
- telepathy: Communicating without words, thought transfer
- future_visions: Seeing future events, prophecies

PHASE 6 — Return (last element should be from here):
- border_boundary: Reaching a barrier, fence, river they cannot cross
- choice_to_return: Given explicit choice, chose to return
- forced_return: Sent back ("It's not your time")
- sudden_return: Instantly back in body
- return_unclear: Narrative ends without describing return

EXTRACTION RULES:
1. First element SHOULD be from Phase 1 (Initial Transition)
2. Last element SHOULD be from Phase 6 (Return)
3. Extract in CHRONOLOGICAL order of the experience, not the telling
4. Include emotional states (Phase 2) only when distinct moments, not background feelings
5. Rate CONFIDENCE (0.0-1.0) based on how clearly described
6. If two things happened SIMULTANEOUSLY, use same order number
7. Minimum 3 elements, maximum 12 elements
8. Excerpts should be short (under 30 words), from the experiencer only

OUTPUT FORMAT (valid JSON only):
{
  "valid": true,
  "nde_type": "positive" | "distressing" | "mixed" | "neutral",
  "sequence": [
    {"order": 1, "element": "element_name", "excerpt": "short quote", "confidence": 0.95}
  ],
  "notes": null
}

If INVALID (too vague, not an NDE/OBE, no clear sequence):
{
  "valid": false,
  "reason": "why extraction failed",
  "nde_type": "neutral",
  "sequence": [],
  "notes": null
}`;
/**
 * Element synonym normalization map.
 * LLMs sometimes output slightly different names — normalize them to the canonical taxonomy.
 */ const ELEMENT_SYNONYMS = {
    'darkness': 'void_darkness',
    'dark': 'void_darkness',
    'void': 'void_darkness',
    'light': 'bright_light',
    'the_light': 'bright_light',
    'oobe': 'observing_body',
    'out_of_body': 'observing_body',
    'obe': 'observing_body',
    'peace': 'peace_calm',
    'calm': 'peace_calm',
    'joy': 'joy_bliss',
    'bliss': 'joy_bliss',
    'love': 'love_unconditional',
    'fear': 'fear_distress',
    'distress': 'fear_distress',
    'music': 'celestial_music',
    'sounds': 'celestial_music',
    'relatives': 'deceased_relatives',
    'family': 'deceased_relatives',
    'beings': 'beings_entities',
    'entities': 'beings_entities',
    'angels': 'beings_entities',
    'god': 'religious_figure',
    'jesus': 'religious_figure',
    'realm': 'otherworldly_realm',
    'heaven': 'otherworldly_realm',
    'hell': 'hellish_realm',
    'garden': 'nature_landscapes',
    'meadow': 'nature_landscapes',
    'city': 'cities_structures',
    'buildings': 'cities_structures',
    'review': 'life_review',
    'knowledge': 'knowledge_download',
    'unity': 'cosmic_unity',
    'oneness': 'cosmic_unity',
    'boundary': 'border_boundary',
    'border': 'border_boundary',
    'choice': 'choice_to_return',
    'forced': 'forced_return',
    'sent_back': 'forced_return'
};
/** All valid canonical element names for validation */ const VALID_ELEMENTS = new Set([
    'observing_body',
    'void_darkness',
    'tunnel',
    'bright_light',
    'peace_calm',
    'joy_bliss',
    'love_unconditional',
    'fear_distress',
    'enhanced_senses',
    'celestial_music',
    'time_distortion',
    'deceased_relatives',
    'beings_entities',
    'being_of_light',
    'religious_figure',
    'unknown_presence',
    'otherworldly_realm',
    'hellish_realm',
    'cities_structures',
    'nature_landscapes',
    'life_review',
    'knowledge_download',
    'cosmic_unity',
    'telepathy',
    'future_visions',
    'border_boundary',
    'choice_to_return',
    'forced_return',
    'sudden_return',
    'return_unclear'
]);
/**
 * Normalizes an element name from the LLM output to the canonical taxonomy.
 * Returns the canonical name if found, or the original if it's already canonical.
 */ function normalizeElement(element) {
    const lower = element.toLowerCase().trim();
    // Already canonical
    if (VALID_ELEMENTS.has(lower)) return lower;
    // Check synonym map
    if (ELEMENT_SYNONYMS[lower]) return ELEMENT_SYNONYMS[lower];
    // Fallback: return as-is (will be caught during validation if invalid)
    return lower;
}
async function analyzeJourneyFlow(subtitles) {
    if (!subtitles) return null;
    // Truncate to keep costs reasonable. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: JOURNEY_FLOW_PROMPT
                },
                {
                    role: "user",
                    content: `Extract the journey flow from this NDE video transcript:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.2
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        // Post-process: normalize element names to handle LLM synonym variations
        if (result.sequence && result.sequence.length > 0) {
            result.sequence = result.sequence.map((item)=>({
                    ...item,
                    element: normalizeElement(item.element)
                }));
        }
        return result;
    } catch (error) {
        console.error("Error in analyzeJourneyFlow:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/cvnde.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CVNDE_ANALYSIS_PROMPT",
    ()=>CVNDE_ANALYSIS_PROMPT,
    "analyzeCvndeScore",
    ()=>analyzeCvndeScore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy OpenAI client initialization
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const CVNDE_ANALYSIS_PROMPT = `You are an expert NDE researcher specializing in veridical perception claims. Analyze the following NDE account using the Claimed Veridical Perception Scale (cvNDE).

The cvNDE Scale evaluates the evidential strength of veridical perception claims — moments where the experiencer reports perceiving real-world information that should have been impossible to know given their medical state and physical position.

IMPORTANT: Many NDE accounts contain NO veridical perception claims at all. If the account does not describe any specific perceptions of the physical world during the experience (e.g., seeing their own resuscitation, hearing specific conversations, perceiving events in other rooms), then all criteria should be scored 1.

## THE 7 CRITERIA (each scored 1-4)

### Criterion 1: Medical State Severity During Perception
What was the reported medical/physical state during which the veridical perceptions occurred?
- 1: Normal/near-normal consciousness, or uncertain medical state
- 2: Altered consciousness without complete unconsciousness (sedation, fainting)
- 3: Deep unconsciousness (general anesthesia, coma, unresponsive)
- 4: Extreme physiological crisis (cardiac arrest, flatline, clinical death, resuscitation required)

### Criterion 2: Perceptual Access Impossibility
How physically impossible was ordinary sensory perception of the reported information?
- 1: Perceptions within potential sensory range (same room, could be heard)
- 2: Impossible vantage point but same location (viewing from above, behind)
- 3: Perceptions physically separated from body (different room, through walls)
- 4: Remote perceptions (different building, different city, miles away)

### Criterion 3: Specificity and Precision of Perceptions
How detailed and specific are the reported veridical perceptions?
- 1: Vague/general impressions ("people around me", "doctors working")
- 2: Moderate detail with some specifics ("woman with dark hair on my left")
- 3: Specific verifiable details (particular words quoted, specific actions described)
- 4: Highly precise, unique details (exact numbers, specific names of strangers, unusual details like plaid shoelaces)

### Criterion 4: Unpredictability of Perceived Information
Could the perceived information have been known beforehand, logically inferred, or reasonably guessed?
- 1: Expected/easily inferred (surgery has doctors, family is worried)
- 2: Could possibly be guessed (general staff appearance, typical procedures)
- 3: Unlikely to be known or guessed (unexpected events, unknown personnel, unusual occurrences)
- 4: Seemingly impossible to know (hidden information, events involving strangers, remote events, info about deceased unknown to experiencer)

### Criterion 5: Self-Reported Verification Quality
Did the experiencer attempt to verify their perceptions, and how compelling is their verification account?
- 1: No verification attempt mentioned, unable to verify, or disconfirming evidence
- 2: Vague/passive verification ("I found out later it was true")
- 3: Specific verification method with general confirmation ("I asked the nurse and she confirmed")
- 4: Detailed verification with specific confirmation ("I asked Dr. Smith about the plaid shoelaces and he turned white and showed them to me")

### Criterion 6: Verified Perception Weight
What is the ratio and quality of verified vs unverified perceptions?
- 1: No claimed verifications; all unverified
- 2: At least one with claimed verification among several unverified
- 3: Multiple (2-4) with claimed verification OR one with exceptional verification quality
- 4: Multiple (5+) with specific verification OR near-complete verification of all claims

### Criterion 7: Temporal Precedence of Perception Report
When did the experiencer share the perception relative to when they learned it was accurate?
- 1: No information about when first reported
- 2: Reported after verification was possible or after they could have learned the info
- 3: Reported to others before claimed verification ("I told the nurse before anyone told me")
- 4: Documented before verification was possible (told multiple witnesses immediately, wrote down details)

## SCORING LEVELS
- 7-12: Low Evidential Strength
- 13-17: Moderate Evidential Strength
- 18-22: High Evidential Strength
- 23-28: Exceptional Evidential Strength

## OUTPUT JSON SCHEMA
{
  "total_score": number,
  "level": "Low Evidential Strength" | "Moderate Evidential Strength" | "High Evidential Strength" | "Exceptional Evidential Strength",
  "summary_reason": "2-3 sentence summary explaining the score and key veridical elements (or lack thereof)",
  "criteria": {
    "medical_state_severity": { "score": 1-4, "reasoning": "brief explanation with quotes if available" },
    "perceptual_access_impossibility": { "score": 1-4, "reasoning": "string" },
    "specificity_precision": { "score": 1-4, "reasoning": "string" },
    "unpredictability": { "score": 1-4, "reasoning": "string" },
    "verification_quality": { "score": 1-4, "reasoning": "string" },
    "verified_perception_weight": { "score": 1-4, "reasoning": "string" },
    "temporal_precedence": { "score": 1-4, "reasoning": "string" }
  }
}

Respond ONLY with the JSON object. Do not include markdown code blocks, explanations, or any other text.`;
async function analyzeCvndeScore(subtitles) {
    if (!subtitles) return null;
    // Truncate to stay within token limits
    const truncatedSubtitles = subtitles.slice(0, 50000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: CVNDE_ANALYSIS_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze this NDE transcript for veridical perception claims:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.1
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        // Validate total_score matches criteria sum
        const criteriaSum = Object.values(result.criteria).reduce((sum, c)=>sum + (c.score || 1), 0);
        if (result.total_score !== criteriaSum) {
            result.total_score = criteriaSum;
        }
        // Ensure correct level classification
        result.level = classifyCvndeScore(result.total_score);
        return result;
    } catch (error) {
        console.error("Error in analyzeCvndeScore:", error);
        return null;
    }
}
/**
 * Maps a total cvNDE score (7-28) to its evidential strength level.
 */ function classifyCvndeScore(score) {
    if (score <= 12) return "Low Evidential Strength";
    if (score <= 17) return "Moderate Evidential Strength";
    if (score <= 22) return "High Evidential Strength";
    return "Exceptional Evidential Strength";
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/nde-summary.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NDE_SUMMARY_PROMPT",
    ()=>NDE_SUMMARY_PROMPT,
    "generateNdeSummary",
    ()=>generateNdeSummary
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Lazy OpenAI client initialization
const getOpenAIClient = ()=>{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
};
const NDE_SUMMARY_PROMPT = `You are an expert NDE researcher. Your task is to analyze transcripts and produce simple, clear, and factual summaries.

You write at a Grade 8 reading level. You follow instructions precisely.

You output ONLY raw JSON with no markdown, no code blocks, and no extra text.

## SUMMARY REQUIREMENTS

Write a clear, 80-150 word summary of this NDE account. Use simple sentences. Structure the summary in this exact order:

1. **Trigger:** Start by stating who the person was and what caused the NDE (e.g., cardiac arrest, accident, surgery complication).
2. **Experience:** Briefly list the key events the person experienced during the NDE in chronological order (e.g., left their body, saw a light, met relatives, was told to return).
3. **Aftermath:** Conclude with the main transformation or change in their life after the NDE (e.g., new sense of purpose, career change, loss of fear of death).

## TONE & STYLE GUIDANCE

- Write for a Grade 8 reading level.
- Use simple, clear, and direct sentences.
- Be factual and objective. Do not add narrative flair or emotional language.
- Report the events as the person described them.
- Use active voice.
- Refer to the experiencer in the third person.

## OUTPUT JSON FORMAT

Return this exact structure with NO other text:

{
  "nde_summary": "Your 80-150 word factual summary here."
}`;
async function generateNdeSummary(subtitles) {
    if (!subtitles) return null;
    // Truncate to stay within token limits — summaries don't need the full text
    const truncatedSubtitles = subtitles.slice(0, 30000);
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: NDE_SUMMARY_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze this NDE transcript and return ONLY a JSON object with the summary:\n\n${truncatedSubtitles}`
                }
            ],
            response_format: {
                type: "json_object"
            },
            temperature: 0.3
        });
        const content = completion.choices[0].message.content;
        if (!content) return null;
        const result = JSON.parse(content);
        // Validate we got a non-empty summary
        if (!result.nde_summary || result.nde_summary.trim().length < 20) {
            console.error("NDE summary too short or empty");
            return null;
        }
        return result;
    } catch (error) {
        console.error("Error in generateNdeSummary:", error);
        return null;
    }
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/fingerprint.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildFingerprint",
    ()=>buildFingerprint
]);
/**
 * Experience Fingerprint Builder
 *
 * Converts NDERF analysis data into a 27-dimension vector.
 * This vector encodes the experiential structure and enables
 * pgvector-based "Similar Experiences" cosine similarity search.
 *
 * Vector layout (27 dimensions):
 *   [0-14]  15 core NDE elements (1.0 present, 0.0 absent)
 *   [15]    Intensity (normalized 0-1, from 1-10 scale)
 *   [16-18] Tone one-hot: [positive, neutral, negative]
 *   [19-23] Experience type one-hot: [nde, obe, sde, adc, other]
 *   [24-26] Trigger one-hot: [medical, accident, spontaneous]
 */ // The 15 core element names in fixed order — must match core-elements.ts
const ELEMENT_NAMES = [
    "out_of_body",
    "tunnel",
    "bright_light",
    "deceased_relatives",
    "life_review",
    "being_of_light",
    "border_boundary",
    "feelings_of_peace",
    "cosmic_unity",
    "time_distortion",
    "enhanced_senses",
    "telepathy",
    "otherworldly_realm",
    "knowledge_download",
    "choice_to_return"
];
// Tone mapping to 3-dim one-hot: [positive, neutral, negative]
function toneVector(tone) {
    switch(tone){
        case "very_positive":
        case "positive":
            return [
                1,
                0,
                0
            ];
        case "neutral":
        case "mixed":
            return [
                0,
                1,
                0
            ];
        case "negative":
        case "very_negative":
            return [
                0,
                0,
                1
            ];
        default:
            return [
                0,
                1,
                0
            ]; // default neutral
    }
}
// Experience type mapping to 5-dim one-hot: [nde, obe, sde, adc, other]
function typeVector(type) {
    switch(type){
        case "nde":
            return [
                1,
                0,
                0,
                0,
                0
            ];
        case "obe":
            return [
                0,
                1,
                0,
                0,
                0
            ];
        case "sde":
            return [
                0,
                0,
                1,
                0,
                0
            ];
        case "adc":
            return [
                0,
                0,
                0,
                1,
                0
            ];
        default:
            return [
                0,
                0,
                0,
                0,
                1
            ]; // ste, dream, meditation, other
    }
}
// Trigger mapping to 3-dim one-hot: [medical, accident, spontaneous]
function triggerVector(trigger) {
    const medical = [
        "medical_crisis",
        "surgery",
        "illness",
        "cardiac_arrest",
        "childbirth",
        "overdose",
        "allergic_reaction"
    ];
    const accident = [
        "accident",
        "near_drowning",
        "combat",
        "suicide_attempt"
    ];
    if (!trigger || trigger === "unknown" || trigger === "other") return [
        0.33,
        0.33,
        0.33
    ];
    if (medical.includes(trigger)) return [
        1,
        0,
        0
    ];
    if (accident.includes(trigger)) return [
        0,
        1,
        0
    ];
    // spontaneous, meditation, etc.
    return [
        0,
        0,
        1
    ];
}
function buildFingerprint(analysis) {
    if (!analysis.core_elements) return null;
    const elements = Array.isArray(analysis.core_elements) ? analysis.core_elements : [];
    // Dims 0-14: Element presence (binary)
    const elementDims = ELEMENT_NAMES.map((name)=>{
        const el = elements.find((e)=>e.name === name);
        return el?.present ? 1.0 : 0.0;
    });
    // Dim 15: Intensity normalized to 0-1
    const intensity = analysis.intensity_rating ? Math.max(0, Math.min(1, (analysis.intensity_rating - 1) / 9)) : 0.5;
    // Dims 16-18: Tone
    const tone = toneVector(analysis.overall_tone);
    // Dims 19-23: Experience type
    const type = typeVector(analysis.experience_type);
    // Dims 24-26: Trigger category
    const trigger = triggerVector(analysis.trigger_category);
    return [
        ...elementDims,
        intensity,
        ...tone,
        ...type,
        ...trigger
    ];
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/pipeline/intake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "processVideoIntake",
    ()=>processVideoIntake
]);
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
 * 8. Generate experience fingerprint
 * 
 * Designed as a pure function so it can be called from:
 * - Admin UI form (via API route)
 * - Future scheduler/cron job
 * - CLI scripts
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$scraper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/scraper.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$subtitles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/subtitles.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$transcript$2d$processor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/youtube/transcript-processor.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$classify$2d$experience$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/classify-experience.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$greyson$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/greyson.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/transformation.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$core$2d$elements$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/core-elements.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$phenomenology$2d$entities$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/phenomenology-entities.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$journey$2d$flow$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/journey-flow.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$cvnde$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/cvnde.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$nde$2d$summary$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/nde-summary.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$fingerprint$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/fingerprint.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
// ─── Supabase Client ─────────────────────────────────────────────────────────
function getSupabaseAdmin() {
    const url = ("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co");
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, key);
}
function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
}
async function processVideoIntake(youtubeUrl, onStep) {
    const steps = [];
    const supabase = getSupabaseAdmin();
    const logStep = (name, status, message, duration_ms)=>{
        const step = {
            name,
            status,
            message,
            duration_ms
        };
        steps.push(step);
        onStep?.(step);
        console.log(`[Intake] ${status.toUpperCase()}: ${name}${message ? ` — ${message}` : ''}`);
    };
    try {
        // ─── Step 1: Parse URL ───────────────────────────────────────
        const startParse = Date.now();
        const videoId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$scraper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseYouTubeUrl"])(youtubeUrl);
        if (!videoId) {
            logStep('Parse URL', 'failed', 'Invalid YouTube URL');
            return {
                status: 'failed',
                videoId: '',
                steps,
                error: 'Invalid YouTube URL'
            };
        }
        logStep('Parse URL', 'success', `Extracted videoId: ${videoId}`, Date.now() - startParse);
        // ─── Step 2: Check if already in DB ──────────────────────────
        const startCheck = Date.now();
        const { data: existing } = await supabase.from('nde_vids').select('videoId, title, isNde, intake_status').eq('videoId', videoId).single();
        if (existing) {
            // Only block if the video was FULLY processed successfully
            if (existing.intake_status === 'complete') {
                logStep('Check Database', 'success', `Already exists: "${existing.title}" (${existing.isNde})`, Date.now() - startCheck);
                return {
                    status: 'already_exists',
                    videoId,
                    title: existing.title,
                    steps
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
        const metadata = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$scraper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchVideoMetadata"])(videoId);
        if (!metadata) {
            logStep('Scrape Metadata', 'failed', 'Video not found or is private/removed');
            return {
                status: 'failed',
                videoId,
                steps,
                error: 'Video not found on YouTube'
            };
        }
        logStep('Scrape Metadata', 'success', `"${metadata.title}"`, Date.now() - startMeta);
        // ─── Step 4: Ensure channel exists ───────────────────────────
        if (metadata.channelId) {
            const startChannel = Date.now();
            const { data: existingChannel } = await supabase.from('channels').select('channel_id').eq('channel_id', metadata.channelId).single();
            if (!existingChannel) {
                logStep('Enrich Channel', 'running', 'New channel — fetching metadata');
                const channelData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$scraper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchChannelMetadata"])(metadata.channelId);
                if (channelData) {
                    const { error: channelError } = await supabase.from('channels').upsert(channelData, {
                        onConflict: 'channel_id'
                    });
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
        const captionResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$subtitles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchCaptions"])(videoId);
        if (!captionResult || captionResult.segments.length === 0) {
            // No captions — still insert the video with metadata
            logStep('Fetch Captions', 'failed', 'No captions available');
            await insertVideoRecord(supabase, videoId, metadata, null, 'insufficient_info', 'no_captions');
            return {
                status: 'no_captions',
                videoId,
                title: metadata.title || undefined,
                steps
            };
        }
        logStep('Fetch Captions', 'success', `${captionResult.segments.length} segments (${captionResult.language}, ${captionResult.isAutoGenerated ? 'auto' : 'manual'})`, Date.now() - startCaptions);
        // ─── Step 6: Process transcripts ─────────────────────────────
        const startProcess = Date.now();
        const transcripts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$transcript$2d$processor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processTranscripts"])(captionResult.segments, videoId);
        logStep('Process Transcripts', 'success', `${transcripts.searchChunks.length} search chunks, ${transcripts.chatChunks.length} chat chunks`, Date.now() - startProcess);
        // ─── Step 7: Insert initial video record ─────────────────────
        await insertVideoRecord(supabase, videoId, metadata, transcripts, null, 'classifying');
        // ─── Step 8: Classify experience ─────────────────────────────
        const startClassify = Date.now();
        logStep('Classify Experience', 'running');
        const classification = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$classify$2d$experience$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyExperience"])(transcripts.punctuated, metadata.title || undefined, metadata.description || undefined);
        if (!classification) {
            logStep('Classify Experience', 'failed', 'Classification returned null');
            await updateIntakeStatus(supabase, videoId, 'failed', 'Classification failed');
            return {
                status: 'failed',
                videoId,
                title: metadata.title || undefined,
                steps,
                error: 'Classification failed'
            };
        }
        logStep('Classify Experience', 'success', `${classification.experience_type} (${classification.confidence}% confidence) — ${classification.isNde_value}`, Date.now() - startClassify);
        // Update isNde value and experiencer name
        const classificationUpdate = {
            isNde: classification.isNde_value,
            isNdeJustification: classification.justification
        };
        if (classification.experiencerFullName) {
            classificationUpdate.experiencerFullName = classification.experiencerFullName;
        }
        await supabase.from('nde_vids').update(classificationUpdate).eq('videoId', videoId);
        // Gate check: stop if not a profound experience
        if (!classification.is_profound) {
            await updateIntakeStatus(supabase, videoId, 'not_profound');
            logStep('Analysis Gate', 'skipped', 'Not a profound experience — stopping pipeline');
            return {
                status: 'not_profound',
                videoId,
                title: metadata.title || undefined,
                classification,
                steps
            };
        }
        // ─── Step 9: Run full analysis suite (parallel) ──────────────
        const startAnalysis = Date.now();
        logStep('Full Analysis', 'running', 'Running 7 analysis passes in parallel...');
        await updateIntakeStatus(supabase, videoId, 'analyzing');
        const [greysonResult, transformResult, coreResult, phenResult, journeyResult, cvndeResult, summaryResult] = await Promise.allSettled([
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$greyson$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeGreysonScore"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeTransformationScore"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$core$2d$elements$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeCoreElements"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$phenomenology$2d$entities$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzePhenomenologyEntities"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$journey$2d$flow$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeJourneyFlow"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$cvnde$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeCvndeScore"])(transcripts.punctuated),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$nde$2d$summary$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateNdeSummary"])(transcripts.punctuated)
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
            summary ? 'Summary ✅' : 'Summary ❌'
        ];
        logStep('Full Analysis', 'success', passResults.join(', '), Date.now() - startAnalysis);
        // ─── Step 10: Save analysis to nde_analysis ──────────────────
        const startSave = Date.now();
        await saveAnalysisResults(supabase, videoId, {
            greyson,
            transform,
            core,
            phen,
            journey
        });
        // Save cvNDE and summary to nde_vids (different table)
        await saveCvndeResults(supabase, videoId, cvnde);
        await saveNdeSummary(supabase, videoId, summary);
        logStep('Save Analysis', 'success', 'All passes saved to nde_analysis + nde_vids', Date.now() - startSave);
        // Update isNde based on core elements (more accurate than gate classification)
        if (core) {
            const refinedIsNde = core.experience_type === 'nde' ? 'clear_nde' : [
                'obe',
                'sde',
                'adc',
                'ste'
            ].includes(core.experience_type) ? 'clear_nde' : 'possible_nde';
            await supabase.from('nde_vids').update({
                isNde: refinedIsNde,
                isNdeJustification: core.summary || classification.justification
            }).eq('videoId', videoId);
        }
        // ─── Step 11: Generate embeddings ────────────────────────────
        const startEmbed = Date.now();
        logStep('Generate Embeddings', 'running');
        await updateIntakeStatus(supabase, videoId, 'indexing');
        await generateEmbeddings(supabase, videoId, transcripts);
        logStep('Generate Embeddings', 'success', 'Search + chat embeddings created', Date.now() - startEmbed);
        // ─── Step 12: Generate fingerprint ───────────────────────────
        if (core) {
            const startFingerprint = Date.now();
            const fingerprint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$fingerprint$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildFingerprint"])({
                core_elements: core.elements,
                intensity_rating: core.intensity_rating,
                overall_tone: core.overall_tone,
                experience_type: core.experience_type,
                trigger_category: core.trigger.category
            });
            if (fingerprint) {
                // Store fingerprint as pgvector in nde_analysis
                const fpString = `[${fingerprint.join(',')}]`;
                await supabase.from('nde_analysis').update({
                    experience_fingerprint: fpString
                }).eq('video_id', videoId);
                logStep('Generate Fingerprint', 'success', '27-dimension vector created', Date.now() - startFingerprint);
            } else {
                logStep('Generate Fingerprint', 'skipped', 'Insufficient data');
            }
        }
        // ─── Step 13: Mark complete ──────────────────────────────────
        await updateIntakeStatus(supabase, videoId, 'complete');
        logStep('Pipeline Complete', 'success', `Video fully processed`);
        return {
            status: 'complete',
            videoId,
            title: metadata.title || undefined,
            classification,
            analysisSummary: core?.summary || 'Analysis complete',
            steps
        };
    } catch (error) {
        logStep('Pipeline Error', 'failed', error.message);
        return {
            status: 'failed',
            videoId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$youtube$2f$scraper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseYouTubeUrl"])(youtubeUrl) || '',
            steps,
            error: error.message
        };
    }
}
// ─── Helper: Insert Video Record ─────────────────────────────────────────────
async function insertVideoRecord(supabase, videoId, metadata, transcripts, isNde, intakeStatus) {
    const record = {
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
        intake_submitted_at: new Date().toISOString()
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
    const { error } = await supabase.from('nde_vids').upsert(record, {
        onConflict: 'videoId'
    });
    if (error) {
        throw new Error(`Failed to upsert video record: ${error.message}`);
    }
}
// ─── Helper: Update Intake Status ────────────────────────────────────────────
async function updateIntakeStatus(supabase, videoId, status, error) {
    const update = {
        intake_status: status
    };
    if (status === 'complete' || status === 'not_profound' || status === 'no_captions') {
        update.intake_completed_at = new Date().toISOString();
    }
    if (error) {
        update.intake_error = error;
    }
    await supabase.from('nde_vids').update(update).eq('videoId', videoId);
}
// ─── Helper: Save Analysis Results ───────────────────────────────────────────
async function saveAnalysisResults(supabase, videoId, results) {
    const { greyson, transform, core, phen, journey } = results;
    const payload = {
        video_id: videoId
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
        payload.transformation_classification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyTransformationScore"])(score);
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
            dominant_entity_type: phen.dominant_entity_type
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
    const { data: existing } = await supabase.from('nde_analysis').select('video_id').eq('video_id', videoId).single();
    if (existing) {
        const { error } = await supabase.from('nde_analysis').update(payload).eq('video_id', videoId);
        if (error) throw new Error(`Failed to update analysis: ${error.message}`);
    } else {
        const { error } = await supabase.from('nde_analysis').insert(payload);
        if (error) throw new Error(`Failed to insert analysis: ${error.message}`);
    }
}
// ─── Helper: Save cvNDE Results to nde_vids ──────────────────────────────────
async function saveCvndeResults(supabase, videoId, cvnde) {
    if (!cvnde) return;
    const update = {
        rvnde_total_score: cvnde.total_score,
        rvnde_level: cvnde.level,
        rvnde_summary_reason: cvnde.summary_reason,
        rvnde_details: cvnde.criteria,
        rvnde_status: 'complete'
    };
    const { error } = await supabase.from('nde_vids').update(update).eq('videoId', videoId);
    if (error) {
        console.error('Error saving cvNDE results:', error);
    }
}
// ─── Helper: Save NDE Summary to nde_vids ────────────────────────────────────
async function saveNdeSummary(supabase, videoId, summary) {
    if (!summary) return;
    const update = {
        analysis_nde_summary: summary.nde_summary,
        analysis_status: 'completed',
        analysis_ai_model_used: 'gpt-4o-mini',
        analysis_generated_timestamp: new Date().toISOString()
    };
    const { error } = await supabase.from('nde_vids').update(update).eq('videoId', videoId);
    if (error) {
        console.error('Error saving NDE summary:', error);
    }
}
// ─── Helper: Generate Embeddings ─────────────────────────────────────────────
async function generateEmbeddings(supabase, videoId, transcripts) {
    const openai = getOpenAIClient();
    // 1. Search embeddings (nde_punctuated_embeddings) — timestamped chunks
    if (transcripts.searchChunks.length > 0) {
        // Batch embed all search chunks
        const searchTexts = transcripts.searchChunks.map((c)=>c.content);
        const searchEmbeddings = await batchEmbed(openai, searchTexts);
        const searchRows = transcripts.searchChunks.map((chunk, i)=>({
                video_id: videoId,
                content: chunk.content,
                start_time: chunk.start_time,
                embedding: searchEmbeddings[i] ? `[${searchEmbeddings[i].join(',')}]` : null
            }));
        const { error: searchError } = await supabase.from('nde_punctuated_embeddings').insert(searchRows);
        if (searchError) {
            console.error('Error inserting search embeddings:', searchError);
        }
    }
    // 2. Chat embeddings (nde_chatbot_chunks) — clean text chunks
    if (transcripts.chatChunks.length > 0) {
        const chatTexts = transcripts.chatChunks.map((c)=>c.content);
        const chatEmbeddings = await batchEmbed(openai, chatTexts);
        const chatRows = transcripts.chatChunks.map((chunk, i)=>({
                video_id: videoId,
                content: chunk.content,
                embedding: chatEmbeddings[i] ? `[${chatEmbeddings[i].join(',')}]` : null,
                metadata: chunk.metadata
            }));
        const { error: chatError } = await supabase.from('nde_chatbot_chunks').insert(chatRows);
        if (chatError) {
            console.error('Error inserting chat embeddings:', chatError);
        }
    }
    // 3. Full text embedding for the video itself
    const fullEmbedding = await batchEmbed(openai, [
        transcripts.cleaned.slice(0, 8000)
    ]);
    if (fullEmbedding[0]) {
        await supabase.from('nde_vids').update({
            subtitles_embedding: `[${fullEmbedding[0].join(',')}]`,
            embed_status: 'complete',
            timestamped_embedding_status: 'complete'
        }).eq('videoId', videoId);
    }
}
/**
 * Batch generate embeddings using OpenAI's text-embedding-3-small.
 * Handles the API in batches of 100 to stay within rate limits.
 */ async function batchEmbed(openai, texts) {
    const results = new Array(texts.length).fill(null);
    const batchSize = 100;
    for(let i = 0; i < texts.length; i += batchSize){
        const batch = texts.slice(i, i + batchSize);
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: batch
            });
            for(let j = 0; j < response.data.length; j++){
                results[i + j] = response.data[j].embedding;
            }
        } catch (error) {
            console.error(`Error embedding batch ${i}-${i + batch.length}:`, error);
        // Leave as null — individual failures don't stop the pipeline
        }
    }
    return results;
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/intake/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "maxDuration",
    ()=>maxDuration
]);
/**
 * Video Intake API Route
 * 
 * POST /api/intake — Submit a YouTube URL for processing
 * 
 * Auth: Admin role via Supabase session OR CRON_SECRET bearer token
 * Returns: IntakeResult with step-by-step processing details
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$pipeline$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/pipeline/intake.ts [app-route] (ecmascript)");
;
;
;
;
;
const maxDuration = 300; // 5 minutes — matches existing batch routes
const dynamic = 'force-dynamic';
async function POST(request) {
    try {
        // ── Parse request body ──────────────────────────────────────
        const body = await request.json();
        const { url } = body;
        if (!url || typeof url !== 'string') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required field: url'
            }, {
                status: 400
            });
        }
        // ── Auth check: admin session OR CRON_SECRET ────────────────
        const isAuthorized = await checkAuth(request);
        if (!isAuthorized) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized. Admin access or CRON_SECRET required.'
            }, {
                status: 401
            });
        }
        // ── Run the pipeline ────────────────────────────────────────
        console.log(`[Intake API] Processing URL: ${url}`);
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$pipeline$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processVideoIntake"])(url);
        // Map status to appropriate HTTP code
        const statusCode = result.status === 'failed' ? 500 : result.status === 'already_exists' ? 200 : 200;
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result, {
            status: statusCode
        });
    } catch (error) {
        console.error('[Intake API] Unhandled error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
// ── Auth Helper ─────────────────────────────────────────────────────────────
async function checkAuth(request) {
    // Method 1: CRON_SECRET bearer token (for scheduler/CLI)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }
    // Method 2: Debug mode bypass (local dev only)
    if (process.env.IS_DEBUG_MODE) {
        return true;
    }
    // Method 3: Supabase session with admin role
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueWNhdmNscm5kandtcGF1Z2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTcyNzksImV4cCI6MjA2MjYzMzI3OX0.L_ExCXhKaHxK_PnOokOlgTjp-eVOlolkj0TAG9WsojI"), {
            cookies: {
                getAll () {
                    return cookieStore.getAll();
                }
            }
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        // Check admin role
        const adminSupabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single();
        return profile?.role === 'admin' || profile?.role === 'super_admin';
    } catch  {
        return false;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__41c0bca2._.js.map