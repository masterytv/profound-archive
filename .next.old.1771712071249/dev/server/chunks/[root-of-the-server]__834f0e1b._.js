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
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-phenomenology-batch/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$phenomenology$2d$entities$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/phenomenology-entities.ts [app-route] (ecmascript)");
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
        console.log(`Starting Phenomenology & Entities Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);
        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase.from('nde_analysis').select('video_id, phenomenology, entities').eq('video_id', targetVideoId).single();
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
            const { data: videos, error } = await supabase.rpc('get_unanalyzed_phenomenology_videos', {
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
                console.log(`Analyzing phenomenology & entities: ${video.title} (${video.videoId})...`);
                const analysisResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$phenomenology$2d$entities$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzePhenomenologyEntities"])(video.subtitles_punctuated);
                // Determine values to save
                let phenomenology;
                let entities;
                if (analysisResult) {
                    phenomenology = analysisResult.phenomenology;
                    entities = {
                        encounters: analysisResult.entities,
                        entity_count: analysisResult.entity_count,
                        dominant_entity_type: analysisResult.dominant_entity_type
                    };
                } else {
                    // Save sentinel values so the RPC skips this video on future batches
                    console.warn(`Analysis returned null for ${video.videoId} — saving sentinel.`);
                    phenomenology = {
                        error: 'AI analysis returned null',
                        timestamp: new Date().toISOString()
                    };
                    entities = {
                        encounters: [],
                        entity_count: 0,
                        error: 'AI analysis returned null'
                    };
                }
                // Upsert: check if row exists, then update or insert
                const { data: checkRow } = await supabase.from('nde_analysis').select('video_id').eq('video_id', video.videoId).single();
                const payload = {
                    phenomenology,
                    entities
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
                } else if (analysisResult === null) {
                    console.log(`Marked ${video.videoId} as failed_analysis (sentinel saved).`);
                    return {
                        videoId: video.videoId,
                        status: 'failed_analysis'
                    };
                } else {
                    const entityCount = analysisResult.entity_count;
                    const vividness = analysisResult.phenomenology.vividness_rating;
                    console.log(`Saved phenomenology for ${video.videoId}: vividness=${vividness}, entities=${entityCount}`);
                    return {
                        videoId: video.videoId,
                        status: 'success',
                        entityCount,
                        vividness
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

//# sourceMappingURL=%5Broot-of-the-server%5D__834f0e1b._.js.map