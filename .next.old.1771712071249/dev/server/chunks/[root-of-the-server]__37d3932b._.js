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
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-journey-flow-batch/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic,
    "maxDuration",
    ()=>maxDuration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$journey$2d$flow$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/journey-flow.ts [app-route] (ecmascript)");
;
;
;
// Initialize Supabase client with service key for server-side operations
const supabaseUrl = ("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseServiceKey);
const maxDuration = 300; // 5 minutes
const dynamic = 'force-dynamic';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetVideoId = searchParams.get('videoId');
        const verifyMode = searchParams.get('verify') === 'true';
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : targetVideoId ? 1 : 3;
        // Security Check — allow IS_DEBUG_MODE to bypass for local dev
        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.CRON_SECRET;
        const isDebug = !!process.env.IS_DEBUG_MODE;
        if (!isDebug) {
            if (!expectedSecret) {
                console.error('CRON_SECRET is not set on the server!');
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Unauthorized: Server configuration error (Secret missing)'
                }, {
                    status: 500
                });
            }
            if (authHeader !== `Bearer ${expectedSecret}`) {
                console.warn('Auth token mismatch.');
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Unauthorized: Token mismatch'
                }, {
                    status: 401
                });
            }
        }
        console.log(`Starting Journey Flow Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);
        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase.from('nde_analysis').select('video_id, journey_valid, journey_nde_type, journey_sequence, journey_notes').eq('video_id', targetVideoId).single();
            if (error) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: 'Verification Fetch',
                analysis
            });
        }
        // Fetch videos to process
        let videosToProcess = [];
        if (targetVideoId) {
            // Single video mode
            const { data: video, error } = await supabase.from('nde_vids').select('videoId, title, subtitles_punctuated').eq('videoId', targetVideoId).single();
            if (error || !video) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: error?.message || 'Video not found'
                }, {
                    status: 404
                });
            }
            if (!video.subtitles_punctuated) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Video has no transcript'
                }, {
                    status: 400
                });
            }
            videosToProcess = [
                video
            ];
        } else {
            // Batch mode — use RPC to get unanalyzed videos efficiently
            const { data: videos, error } = await supabase.rpc('get_unanalyzed_journey_flow_videos', {
                batch_limit: limit
            });
            if (error) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: error.message
                }, {
                    status: 500
                });
            }
            videosToProcess = videos || [];
        }
        if (videosToProcess.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: `Batch complete. No new videos to process.`,
                processedCount: 0,
                results: []
            });
        }
        // Process in Parallel (see LEARNINGS.md - avoids timeouts)
        console.log(`Processing ${videosToProcess.length} videos in parallel...`);
        const processPromises = videosToProcess.map(async (video)=>{
            try {
                console.log(`Analyzing journey flow: ${video.title} (${video.videoId})...`);
                const analysisResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$journey$2d$flow$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeJourneyFlow"])(video.subtitles_punctuated);
                // Determine values to save
                let journeyValid;
                let journeyNdeType;
                let journeySequence;
                let journeyNotes;
                if (analysisResult) {
                    journeyValid = analysisResult.valid;
                    journeyNdeType = analysisResult.nde_type;
                    journeySequence = analysisResult.sequence;
                    journeyNotes = analysisResult.notes || analysisResult.reason || null;
                } else {
                    // Save sentinel values so the RPC skips this video on future batches
                    console.warn(`Analysis returned null for ${video.videoId} — saving sentinel.`);
                    journeyValid = false;
                    journeyNdeType = 'analysis_failed';
                    journeySequence = [];
                    journeyNotes = 'AI analysis returned null';
                }
                // Upsert: check if row exists, then update or insert
                const { data: checkRow } = await supabase.from('nde_analysis').select('video_id').eq('video_id', video.videoId).single();
                const payload = {
                    journey_valid: journeyValid,
                    journey_nde_type: journeyNdeType,
                    journey_sequence: journeySequence,
                    journey_notes: journeyNotes
                };
                let dbOp;
                if (checkRow) {
                    dbOp = await supabase.from('nde_analysis').update(payload).eq('video_id', video.videoId);
                } else {
                    dbOp = await supabase.from('nde_analysis').insert({
                        video_id: video.videoId,
                        ...payload
                    });
                }
                if (dbOp.error) {
                    console.error(`Error saving ${video.videoId}:`, dbOp.error);
                    return {
                        videoId: video.videoId,
                        status: 'error',
                        error: dbOp.error.message
                    };
                } else if (journeyNdeType === 'analysis_failed') {
                    console.log(`Marked ${video.videoId} as failed_analysis (sentinel saved).`);
                    return {
                        videoId: video.videoId,
                        status: 'failed_analysis'
                    };
                } else {
                    const elementCount = journeySequence?.length || 0;
                    console.log(`Saved journey flow for ${video.videoId}: ${journeyNdeType} (${elementCount} elements)`);
                    return {
                        videoId: video.videoId,
                        status: 'success',
                        journeyNdeType,
                        elementCount
                    };
                }
            } catch (err) {
                console.error(`Exception analyzing ${video.videoId}:`, err);
                return {
                    videoId: video.videoId,
                    status: 'error',
                    error: err.message
                };
            }
        });
        const results = await Promise.all(processPromises);
        const successCount = results.filter((r)=>r.status === 'success').length;
        const failedCount = results.filter((r)=>r.status === 'failed_analysis').length;
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: `Batch complete. Processed ${successCount} videos (${failedCount} failed).`,
            processedCount: successCount,
            attemptedCount: results.length,
            failedCount,
            results
        });
    } catch (err) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__37d3932b._.js.map