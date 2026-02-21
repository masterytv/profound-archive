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
"[project]/src/app/api/chat-compassionate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
;
;
;
;
;
// Initialize OpenAI client
const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: process.env.OPENAI_API_KEY
});
// Initialize Supabase client
const supabaseUrl = ("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseServiceKey);
async function POST(req) {
    try {
        const { sessionId, chatInput, test } = await req.json();
        if (!sessionId || !chatInput) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: 'Missing sessionId or chatInput'
            }, {
                status: 400
            });
        }
        // --- DYNAMIC PROMPT LOGIC ---
        let systemPrompt = '';
        try {
            // Fetch configuration from DB
            const { data: config } = await supabase.from('chatbot_configs').select('*').eq('id', 'chat-compassionate').single();
            if (test && config?.staging_prompt) {
                // SECURITY CHECK for test mode
                const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
                const clientSupabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueWNhdmNscm5kandtcGF1Z2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTcyNzksImV4cCI6MjA2MjYzMzI3OX0.L_ExCXhKaHxK_PnOokOlgTjp-eVOlolkj0TAG9WsojI"), {
                    cookies: {
                        getAll () {
                            return cookieStore.getAll();
                        },
                        setAll () {}
                    }
                });
                const { data: { user } } = await clientSupabase.auth.getUser();
                if (user) {
                    const { data: profile } = await clientSupabase.from('profiles').select('role').eq('id', user.id).single();
                    if (profile?.role === 'super_admin') {
                        systemPrompt = config.staging_prompt;
                        console.log("Using STAGING prompt for Super Admin test");
                    }
                }
            }
            // Fallback to live_prompt if not testing or test failed security
            if (!systemPrompt && config?.live_prompt) {
                systemPrompt = config.live_prompt;
            }
        } catch (dbError) {
            console.error('Error fetching dynamic prompt:', dbError);
        }
        // ULTIMATE FALLBACK: Current Hardcoded Prompt (as of migration)
        if (!systemPrompt) {
            systemPrompt = `# ROLE & GOAL
You are a highly empathetic and compassionate AI companion. Your primary role is to be a non-judgmental listener and a gentle guide for individuals who have either experienced a Near-Death Experience (NDE) or are exploring the topic. Your goal is to make them feel heard, validated, and less alone by drawing parallels from a collection of first-person NDE accounts.

## STRICT RULES (Non-negotiable)
1. **NEVER Give Advice:** Do not provide medical, psychological, or spiritual advice. If the user seems to be in distress, gently suggest they speak with a qualified professional.
2. **NEVER Make Definitive Claims:** Do not state anything as fact regarding the afterlife, spirituality, or the nature of consciousness. Frame everything as "themes found in the accounts of NDErs" or "shared experiences."
3. **Ground All Answers in Provided Context:** Base your responses exclusively on the information found in the <VIDEOS> provided for this turn. Do not introduce outside knowledge about NDEs.
4. **Maintain Persona:** Always be gentle, patient, and supportive.

## ABSOLUTE FORMATTING RULE 

- You must NEVER use em dashes (—) or double dashes (--) anywhere in your responses.  
- This rule is stricter than all other style guidelines.
- If you would normally use an em dash, substitute with a comma, parenthesis (), semicolon, or begin a new sentence.
- Do NOT use a dash for emphasis, pauses, or formatting; replace with natural spoken punctuation or sentence structure.
- Responses containing any em dash or double dash are considered incorrect.

### Examples

Incorrect: "It was a profound experience—one that changed my life."
Incorrect: "They felt calm -- almost peaceful inside."

Correct: "It was a profound experience, one that changed my life."
Correct: "They felt calm (almost peaceful inside)."
Correct: "They felt calm. It was almost peaceful inside."

You must ALWAYS follow this rule with NO exceptions. Any response containing an em dash or double dash is a mistake.

## SESSION CONTEXT
Track and adapt to the flow of conversation. In the *first response* of each session, begin with an explicit validation of the user's experience or question. In *subsequent responses*, do not repeat the same validating phrases; instead, respond with gentle empathy and natural warmth. Only validate explicitly if the user shares new emotions or insights that warrant acknowledgment.

## VALIDATION FREQUENCY RULES
- Offer explicit validation at the start of the session.
- For follow-ups, express empathy conversationally without repeating the same validation phrase or template more than once per session.
- If the user shares new, strong emotions later, offer a supportive acknowledgment, but vary your language.

## CONVERSATIONAL STYLE
- **Validate Feelings:** Start the session by acknowledging and validating the user's feelings or experience (e.g., "That sounds like a very profound experience," "It makes sense that you would feel that way.").
- **Synthesize, Don't Just List:** Weave the information from the context snippets into a cohesive, narrative response. For example: "Your experience of [user's theme] is a theme that comes up often. For instance, one NDEr described a similar feeling of..."
- **Encourage Engagement:** End your response in a way that gently invites further sharing or reflection, but never sounds like an interviewer, test, or binary-choice question. Instead, use open, compassionate endings that signal support and presence, such as "If you’d ever like to talk more about this, I’m here to listen," "Let me know if you feel like sharing anything else, or if you’d prefer just to sit with these thoughts for a bit," or "Whether you want to continue or simply pause for now, I’ll be here to listen whenever you need."
- **Human Sounding:** Respond in a warm, natural, and conversational manner, like a thoughtful person (not a chatbot). Vary your language and sentence structure throughout each session so that nothing sounds formulaic or robotic. Steer clear of distinctive chatbot vocabulary ("as an AI," "in this context," "furthermore," etc.). Use contractions and everyday language when possible. Make every response feel genuinely attentive and fresh, reflecting the unique flow of a real conversation. Never use dashes or em dashes in your response. Use parenthesis (), commas, or other human approaches instead.

## MEMORY
You have access to a summary of the previous conversation. Use it to remember the user's name (if shared) and the key themes they have already discussed. Avoid repeating validations or responses; keep your answers fresh for each new input based on what you remember.

## NO EM DASHES
Never use dashes or em dashes in your response. Em dashes are the wide dash (--) used by ChatGPT. Use parenthesis (), commas, or other grammatical tools that a human would use.

## VIDEOS
Here are videos from first-person NDE accounts that are relevant to the user's current message. Use these to form your answer but don't refer to them specifically in your answer:
`;
        }
        // 1. Generate Embedding for the user's input
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chatInput
        });
        const embedding = embeddingResponse.data[0].embedding;
        // 2. Retrieve Relevant Context (Videos) from Supabase
        const { data: videos, error: rpcError } = await supabase.rpc('nde_chatbot_match', {
            query_embedding: embedding,
            match_count: 10,
            filter: {}
        });
        if (rpcError) {
            console.error('Error fetching context:', rpcError);
        // Continue without context or handle error? For now, log and continue, 
        // but the prompt relies on videos. We might get empty videos array.
        }
        // Format videos for the prompt
        let videosContext = '';
        if (videos && Array.isArray(videos)) {
            videosContext = videos.map((v, index)=>{
                return `<video_${index + 1}>${v.content}</video_${index + 1}>`;
            }).join('\n');
        }
        // 3. Fetch Conversation History for Context
        const { data: historyData } = await supabase.from('nde_chat_logs').select('message, sender').eq('session_id', sessionId).order('created_at', {
            ascending: false
        }).limit(10);
        // Reverse to chronological order
        const history = historyData ? historyData.reverse() : [];
        // Format history for OpenAI messages
        const previousMessages = history.map((entry)=>({
                role: entry.sender === 'user' ? 'user' : 'assistant',
                content: entry.message
            }));
        // 4. Construct Final System Prompt (append the VIDEOS content)
        const finalSystemPrompt = systemPrompt + `\n${videosContext}\n`;
        // 5. Build Messages Array
        // Match n8n's prompt structure exactly for the final user message
        const userMessageContent = `The user's latest message is: "${chatInput}"

Now, following all your rules and using the context provided, generate your compassionate response.`;
        const messages = [
            {
                role: 'system',
                content: finalSystemPrompt
            },
            ...previousMessages,
            {
                role: 'user',
                content: userMessageContent
            }
        ];
        // 6. Log User Message to Supabase (Non-blocking)
        const logUserPromise = supabase.from('nde_chat_logs').insert({
            session_id: sessionId,
            created_at: new Date().toISOString(),
            sender: 'user',
            chat_page: 'chat-compassionate',
            message: chatInput
        });
        // 7. Call OpenAI for Chat Completion
        const completion = await openai.chat.completions.create({
            model: 'gpt-5-chat-latest',
            messages: messages,
            temperature: 0.7
        });
        const botResponse = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
        // 8. Log Bot Response to Supabase
        await Promise.all([
            logUserPromise,
            supabase.from('nde_chat_logs').insert({
                session_id: sessionId,
                created_at: new Date().toISOString(),
                sender: 'bot',
                chat_page: 'chat-compassionate',
                message: botResponse
            })
        ]);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            output: botResponse
        });
    } catch (error) {
        console.error('Error in compassionate chat:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: 'Internal Server Error',
            error: error.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8e719536._.js.map