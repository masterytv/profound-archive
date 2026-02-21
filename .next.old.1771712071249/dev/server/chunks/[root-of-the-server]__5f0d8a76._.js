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
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-transformation-batch/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/ai/transformation.ts [app-route] (ecmascript)");
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
        console.log(`Starting Transformation Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);
        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase.from('nde_analysis').select('video_id, transformation_score, transformation_classification, transformation_breakdown').eq('video_id', targetVideoId).single();
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
            // Single video mode - fetch directly
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
            // Batch mode - use RPC to get unanalyzed videos efficiently
            // This bypasses Supabase's default 1000-row limit (see LEARNINGS.md)
            const { data: videos, error } = await supabase.rpc('get_unanalyzed_transformation_videos', {
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
                console.log(`Analyzing transformation: ${video.title} (${video.videoId})...`);
                const analysisResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeTransformationScore"])(video.subtitles_punctuated);
                if (analysisResult) {
                    const score = analysisResult.quantitative_metrics.overall_transformation_score;
                    const classification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$ai$2f$transformation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyTransformationScore"])(score);
                    // Check if a row already exists for this video
                    const { data: checkRow } = await supabase.from('nde_analysis').select('video_id').eq('video_id', video.videoId).single();
                    let dbOp;
                    if (checkRow) {
                        // Update existing row
                        dbOp = await supabase.from('nde_analysis').update({
                            transformation_score: score,
                            transformation_classification: classification,
                            transformation_breakdown: analysisResult
                        }).eq('video_id', video.videoId);
                    } else {
                        // Insert new row
                        dbOp = await supabase.from('nde_analysis').insert({
                            video_id: video.videoId,
                            transformation_score: score,
                            transformation_classification: classification,
                            transformation_breakdown: analysisResult
                        });
                    }
                    if (dbOp.error) {
                        console.error(`Error saving ${video.videoId}:`, dbOp.error);
                        return {
                            videoId: video.videoId,
                            status: 'error',
                            error: dbOp.error.message
                        };
                    } else {
                        console.log(`Saved transformation analysis for ${video.videoId}: Score ${score} (${classification})`);
                        return {
                            videoId: video.videoId,
                            status: 'success',
                            score,
                            classification
                        };
                    }
                } else {
                    console.error(`Failed to analyze ${video.videoId}`);
                    return {
                        videoId: video.videoId,
                        status: 'failed_analysis'
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
        const processedCount = results.filter((r)=>r.status === 'success').length;
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: `Batch complete. Processed ${processedCount} videos.`,
            processedCount,
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

//# sourceMappingURL=%5Broot-of-the-server%5D__5f0d8a76._.js.map