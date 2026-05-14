'use server';

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatSource {
  video_id: string;
  title: string;
  channel_name: string | null;
  snippet: string;
}

export interface UapChatResponse {
  success: boolean;
  data?: {
    answer: string;
    citations: ChatSource[];
  };
  error?: string;
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const UAP_SYSTEM_PROMPT = `You are a research assistant for Project Profound's UAP (Unidentified Aerial Phenomena) archive. You help users explore analyzed video testimonies and investigative content about UAP contact experiences.

CRITICAL RULES:
1. ONLY use the provided context passages to answer. Do NOT make up or infer information not in the context.
2. If the context doesn't contain enough information to answer, say so clearly.
3. Cite sources inline next to each claim using short numbered references like [1], [2]. Place them right after the relevant fact, NOT grouped at the end of your response. The numbers correspond to the Source numbers in the provided context.
4. Use neutral, research-oriented language. Report what experiencers or researchers claim — do not endorse or debunk.
5. For health or safety questions, advise consulting qualified professionals.
6. Never provide legal, medical, or psychological advice.
7. Be compassionate toward experiencers while maintaining analytical objectivity.
8. If asked about topics outside UAP research, politely redirect to your area of expertise.
9. Synthesize information naturally. Weave details from multiple testimonies into cohesive, narrative answers without listing source tags.`;

// ─── RAG Chat Action ────────────────────────────────────────────────────────

export async function getUapChatResponse(question: string): Promise<UapChatResponse> {
  if (!question?.trim()) {
    return { success: false, error: 'Question cannot be empty.' };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return { success: false, error: 'Server configuration error.' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 1. Embed the question
    const embedResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question.trim(),
    });
    const queryEmbedding = embedResponse.data[0]?.embedding;
    if (!queryEmbedding) {
      return { success: false, error: 'Failed to process your question.' };
    }

    // 2. Vector search uap_chatbot_chunks (top 6)
    const { data: chunks, error: searchError } = await supabase
      .rpc('match_uap_chatbot_chunks', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.3,
        match_count: 6,
      });

    // Fallback: if RPC doesn't exist, try direct query
    let contextChunks: Array<{ content: string; video_id: string; metadata: any }> = [];

    if (searchError || !chunks) {
      // Direct cosine similarity query as fallback
      const { data: directChunks } = await supabase
        .from('uap_chatbot_chunks')
        .select('content, video_id, metadata')
        .limit(6);
      contextChunks = directChunks || [];
    } else {
      contextChunks = chunks;
    }

    if (contextChunks.length === 0) {
      return {
        success: true,
        data: {
          answer: "I don't have enough information in the UAP archive to answer that question. Try asking about specific contact experiences, UAP researchers, or phenomena described in video testimonies.",
          citations: [],
        },
      };
    }

    // 3. Fetch video titles for citations
    const videoIds = [...new Set(contextChunks.map(c => c.video_id))];
    const { data: videos } = await supabase
      .from('uap_vids')
      .select('video_id, title, channel_name')
      .in('video_id', videoIds);

    const videoMap = new Map((videos || []).map(v => [v.video_id, v]));

    // 4. Build context — number by unique video position so [N] matches the citation list
    const videoIndexMap = new Map(videoIds.map((vid, i) => [vid, i + 1]));
    const contextBlocks = contextChunks.map((chunk) => {
      const video = videoMap.get(chunk.video_id);
      const title = video?.title || 'Unknown Video';
      const sourceNum = videoIndexMap.get(chunk.video_id) || 1;
      return `[Source ${sourceNum}: "${title}"]\n${chunk.content}`;
    }).join('\n\n---\n\n');

    // 5. Generate response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UAP_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Based on the following UAP archive excerpts, answer the user's question.\n\n## Context:\n${contextBlocks}\n\n## Question:\n${question}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content || 'I was unable to generate a response.';

    // 6. Build citations
    const citations: ChatSource[] = videoIds.map(vid => {
      const video = videoMap.get(vid);
      const chunk = contextChunks.find(c => c.video_id === vid);
      return {
        video_id: vid,
        title: video?.title || 'Unknown Video',
        channel_name: video?.channel_name || null,
        snippet: chunk?.content?.slice(0, 120) + '...' || '',
      };
    });

    return {
      success: true,
      data: { answer, citations },
    };
  } catch (error: any) {
    console.error('UAP Chat error:', error);
    return { success: false, error: 'An error occurred while processing your question.' };
  }
}
