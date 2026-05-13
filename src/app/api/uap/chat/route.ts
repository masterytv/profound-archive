import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI client lazily to avoid build-time errors
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new OpenAI({ apiKey });
};

// Initialize Supabase client (service role for RAG retrieval)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getServiceClient = () => createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY!);

// UAP-specific system prompt
const UAP_SYSTEM_PROMPT = `# ROLE & GOAL
You are an AI research assistant specializing in UFO, UAP (Unidentified Aerial Phenomena), and alien contact experiences. You help users explore analyzed video testimonies and investigative content from Project Profound's UAP archive.

Your knowledge is grounded exclusively in the video content provided below. You are knowledgeable, curious, and intellectually honest.

## STRICT RULES (Non-negotiable)
1. **Ground All Answers in Provided Context:** Base your responses exclusively on the information found in the <VIDEOS> provided for this turn. Do not introduce outside knowledge about UFOs or UAP.
2. **NEVER Make Definitive Claims:** Do not state anything as fact regarding extraterrestrial life, government conspiracies, or the nature of the phenomena. Frame everything as "according to the testimony in our archive" or "experiencers report."
3. **Maintain Analytical Objectivity:** Report what experiencers and researchers claim. Do not endorse or debunk. Use neutral, research-oriented language.
4. **NEVER Give Advice:** Do not provide medical, psychological, or legal advice. If someone seems distressed by their experiences, gently suggest they speak with a qualified professional.
5. **For health or safety questions:** Advise consulting qualified professionals.
6. **If asked about topics outside UAP research:** Politely redirect to your area of expertise.

## ABSOLUTE FORMATTING RULE

- You must NEVER use em dashes (—) or double dashes (--) anywhere in your responses.
- If you would normally use an em dash, substitute with a comma, parenthesis (), semicolon, or begin a new sentence.
- Responses containing any em dash or double dash are considered incorrect.

## CONVERSATIONAL STYLE
- **Be Curious and Engaged:** Show genuine interest in the phenomena. Ask thoughtful follow-up questions that encourage deeper exploration.
- **Cite Sources:** When referencing specific claims, indicate which video testimony they come from using the format "[Video: TITLE]" when possible.
- **Synthesize, Don't Just List:** Weave information from multiple testimonies into cohesive, narrative responses.
- **Acknowledge Uncertainty:** When evidence is limited or contradictory, say so clearly. This builds trust.
- **Human Sounding:** Respond naturally and conversationally. Avoid chatbot vocabulary ("as an AI," "in this context," "furthermore"). Use contractions and everyday language.

## MEMORY
You have access to the previous conversation. Use it to remember key themes already discussed. Keep your answers fresh for each new input.

## VIDEOS
Here are excerpts from UAP video testimonies and research content relevant to the user's current message. Use these to form your answer:
`;

export async function POST(req: NextRequest) {
    try {
        const supabase = getServiceClient();
        const { sessionId, chatInput } = await req.json();

        if (!sessionId || !chatInput) {
            return NextResponse.json(
                { message: 'Missing sessionId or chatInput' },
                { status: 400 }
            );
        }

        // 1. Generate embedding for the user's input
        const openai = getOpenAIClient();
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chatInput,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. Retrieve relevant context from uap_chatbot_chunks via vector search
        const { data: chunks, error: rpcError } = await supabase.rpc('match_uap_chatbot_chunks', {
            query_embedding: `[${embedding.join(',')}]`,
            match_threshold: 0.3,
            match_count: 8,
        });

        if (rpcError) {
            console.error('Error fetching UAP context:', rpcError);
        }

        // Format context for the prompt
        let videosContext = '';
        if (chunks && Array.isArray(chunks)) {
            // Fetch video titles for better citations
            const videoIds = [...new Set(chunks.map((c: any) => c.video_id))];
            const { data: videos } = await supabase
                .from('uap_vids')
                .select('video_id, title, channel_name')
                .in('video_id', videoIds);

            const videoMap = new Map((videos || []).map((v: any) => [v.video_id, v]));

            videosContext = chunks.map((chunk: any, index: number) => {
                const video = videoMap.get(chunk.video_id);
                const title = video?.title || 'Unknown Video';
                const channel = video?.channel_name || '';
                return `<video_${index + 1} title="${title}" channel="${channel}">${chunk.content}</video_${index + 1}>`;
            }).join('\n');
        }

        // 3. Fetch conversation history for context
        const { data: historyData } = await supabase
            .from('nde_chat_logs')
            .select('message, sender')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Reverse to chronological order
        const history = historyData ? historyData.reverse() : [];

        // Format history for OpenAI messages
        const previousMessages = history.map((entry: any) => ({
            role: entry.sender === 'user' ? 'user' : 'assistant',
            content: entry.message,
        }));

        // 4. Construct final system prompt with video context
        const finalSystemPrompt = UAP_SYSTEM_PROMPT + `\n${videosContext}\n`;

        // 5. Build messages array
        const userMessageContent = `The user's latest message is: "${chatInput}"

Now, following all your rules and using the context provided, generate your research-grounded response.`;

        const messages: any[] = [
            { role: 'system', content: finalSystemPrompt },
            ...previousMessages,
            { role: 'user', content: userMessageContent }
        ];

        // 6. Log user message to Supabase (non-blocking)
        const logUserPromise = supabase.from('nde_chat_logs').insert({
            session_id: sessionId,
            created_at: new Date().toISOString(),
            sender: 'user',
            chat_page: 'uap-chat',
            message: chatInput,
        });

        // 7. Call OpenAI for chat completion
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.4,
            max_tokens: 1200,
        });

        const botResponse = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";

        // 8. Log bot response to Supabase
        await Promise.all([
            logUserPromise,
            supabase.from('nde_chat_logs').insert({
                session_id: sessionId,
                created_at: new Date().toISOString(),
                sender: 'bot',
                chat_page: 'uap-chat',
                message: botResponse,
            })
        ]);

        return NextResponse.json({ output: botResponse });

    } catch (error: any) {
        console.error('Error in UAP chat:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: error.message },
            { status: 500 }
        );
    }
}
