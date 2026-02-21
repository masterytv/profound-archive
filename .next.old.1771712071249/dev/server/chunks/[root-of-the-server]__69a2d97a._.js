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
"[project]/src/lib/ai/greyson.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GREYSON_ANALYSIS_PROMPT",
    ()=>GREYSON_ANALYSIS_PROMPT,
    "analyzeGreysonScore",
    ()=>analyzeGreysonScore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
// Initialize OpenAI client
// Note: In server-side contexts, we can instantiate this here.
// In edge functions, we might need to instantiate inside the function.
const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: process.env.OPENAI_API_KEY
});
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
"[project]/src/app/api/run-greyson-batch/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$greyson$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/ai/greyson.ts [app-route] (ecmascript)");
;
;
;
// Initialize Supabase client
const supabaseUrl = ("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseServiceKey);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetVideoId = searchParams.get('videoId');
        const verifyMode = searchParams.get('verify') === 'true';
        const limit = targetVideoId ? 1 : 5;
        console.log(`Starting Greyson Analysis Batch via API... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase.from('nde_analysis').select('*').eq('video_id', targetVideoId).single();
            if (error) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: 'Verification Fetch',
                analysis
            });
        }
        // Build Query
        let query = supabase.from('nde_vids').select('videoId, title, subtitles_punctuated').not('subtitles_punctuated', 'is', null).order('created_at', {
            ascending: false
        });
        if (targetVideoId) {
            query = query.eq('videoId', targetVideoId);
        }
        const { data: videos, error } = await query;
        if (error) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
        }
        if (!videos || videos.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: 'No videos found.'
            }, {
                status: 404
            });
        }
        const results = [];
        let processedCount = 0;
        for (const video of videos){
            if (processedCount >= limit) break;
            // Check if analysis already exists
            const { data: existingAnalysis } = await supabase.from('nde_analysis').select('video_id, greyson_breakdown').eq('video_id', video.videoId).single();
            // Skip if exists AND NOT targeting specific video (if targeting, we overwrite/update)
            if (!targetVideoId && existingAnalysis?.greyson_breakdown) {
                continue;
            }
            console.log(`Analyzing: ${video.title} (${video.videoId})...`);
            if (!video.subtitles_punctuated) continue;
            const analysisResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$greyson$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeGreysonScore"])(video.subtitles_punctuated);
            if (analysisResult) {
                // Save to Database
                const { data: checkRow } = await supabase.from('nde_analysis').select('video_id').eq('video_id', video.videoId).single();
                let dbOp;
                if (checkRow) {
                    dbOp = await supabase.from('nde_analysis').update({
                        total_greyson_score: analysisResult.total_score,
                        scale_agreement: analysisResult.classification,
                        greyson_breakdown: analysisResult.breakdown
                    }).eq('video_id', video.videoId);
                } else {
                    dbOp = await supabase.from('nde_analysis').insert({
                        video_id: video.videoId,
                        total_greyson_score: analysisResult.total_score,
                        scale_agreement: analysisResult.classification,
                        greyson_breakdown: analysisResult.breakdown
                    });
                }
                if (dbOp.error) {
                    console.error(`Error saving ${video.videoId}:`, dbOp.error);
                    results.push({
                        videoId: video.videoId,
                        status: 'error',
                        error: dbOp.error.message
                    });
                } else {
                    console.log(`Saved analysis for ${video.videoId}`);
                    results.push({
                        videoId: video.videoId,
                        status: 'success',
                        score: analysisResult.total_score
                    });
                    processedCount++;
                }
            } else {
                console.error(`Failed to analyze ${video.videoId}`);
                results.push({
                    videoId: video.videoId,
                    status: 'failed_analysis'
                });
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: `Batch complete. Processed ${processedCount} videos.`,
            results
        });
    } catch (err) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__69a2d97a._.js.map