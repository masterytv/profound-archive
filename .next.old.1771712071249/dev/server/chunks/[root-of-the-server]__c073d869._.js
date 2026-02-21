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
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-core-elements-batch/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$core$2d$elements$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/core-elements.ts [app-route] (ecmascript)");
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
        console.log(`Starting Core Elements Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);
        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase.from('nde_analysis').select('video_id, experience_type, experience_type_confidence, core_elements, trigger_category, overall_tone, intensity_rating, content_safety').eq('video_id', targetVideoId).single();
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
            const { data: videos, error } = await supabase.rpc('get_unanalyzed_core_elements_videos', {
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
                console.log(`Analyzing core elements: ${video.title} (${video.videoId})...`);
                const analysisResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$core$2d$elements$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeCoreElements"])(video.subtitles_punctuated);
                // Determine values to save
                let experienceType;
                let experienceTypeConfidence;
                let coreElements;
                let triggerCategory;
                let triggerDescription;
                let overallTone;
                let intensityRating;
                let contentSafety;
                if (analysisResult) {
                    experienceType = analysisResult.experience_type;
                    experienceTypeConfidence = analysisResult.type_confidence;
                    coreElements = analysisResult.elements;
                    triggerCategory = analysisResult.trigger.category;
                    triggerDescription = analysisResult.trigger.description;
                    overallTone = analysisResult.overall_tone;
                    intensityRating = analysisResult.intensity_rating;
                    contentSafety = analysisResult.content_safety;
                } else {
                    // Save sentinel values so the RPC skips this video on future batches
                    console.warn(`Analysis returned null for ${video.videoId} — saving sentinel.`);
                    experienceType = 'analysis_failed';
                    experienceTypeConfidence = 0;
                    coreElements = {
                        error: 'AI analysis returned null',
                        timestamp: new Date().toISOString()
                    };
                    triggerCategory = 'unknown';
                    triggerDescription = '';
                    overallTone = 'neutral';
                    intensityRating = -1;
                    contentSafety = {};
                }
                // Upsert: check if row exists, then update or insert
                const { data: checkRow } = await supabase.from('nde_analysis').select('video_id').eq('video_id', video.videoId).single();
                const payload = {
                    experience_type: experienceType,
                    experience_type_confidence: experienceTypeConfidence,
                    core_elements: coreElements,
                    trigger_category: triggerCategory,
                    trigger_description: triggerDescription,
                    overall_tone: overallTone,
                    intensity_rating: intensityRating,
                    content_safety: contentSafety
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
                } else if (experienceType === 'analysis_failed') {
                    console.log(`Marked ${video.videoId} as failed_analysis (sentinel saved).`);
                    return {
                        videoId: video.videoId,
                        status: 'failed_analysis'
                    };
                } else {
                    console.log(`Saved core elements for ${video.videoId}: ${experienceType} (${experienceTypeConfidence}%)`);
                    return {
                        videoId: video.videoId,
                        status: 'success',
                        experienceType
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

//# sourceMappingURL=%5Broot-of-the-server%5D__c073d869._.js.map