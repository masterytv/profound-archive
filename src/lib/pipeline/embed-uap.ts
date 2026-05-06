/**
 * UAP Embedding Pipeline
 *
 * Copy-Modify from: src/lib/pipeline/intake.ts (generateEmbeddings + batchEmbed, lines 662-769)
 *
 * Generates embeddings for UAP videos using OpenAI text-embedding-3-small:
 *   1. Search embeddings → uap_punctuated_embeddings (timestamped chunks)
 *   2. Chat embeddings → uap_chatbot_chunks (clean text chunks)
 *
 * Design: Pure function, called from batch script.
 * Tier 3 gate: refuses to process out_of_scope videos.
 * Insert pattern: 1 row at a time (pgvector rows are ~6KB; batching triggers Supabase timeouts).
 */

import OpenAI from 'openai';
import type { UapSearchChunk, UapChatChunk } from './punctuate-uap';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmbedUapResult {
  videoId: string;
  searchChunksInserted: number;
  chatChunksInserted: number;
}

// ─── Main Embedding Function ─────────────────────────────────────────────────

/**
 * Generate and insert embeddings for a UAP video's punctuated chunks.
 *
 * Mirrors the NDE intake.ts generateEmbeddings pattern:
 * - Deletes existing embeddings first (supports re-processing)
 * - Embeds via OpenAI text-embedding-3-small
 * - Inserts 1 row at a time with 100ms delay (avoids connection pool exhaustion)
 *
 * @param supabase - Supabase admin client (service_role)
 * @param openai - OpenAI client
 * @param videoId - The video_id from uap_vids
 * @param searchChunks - Timestamped chunks for semantic search
 * @param chatChunks - Clean text chunks for RAG chat
 */
export async function embedUapVideo(
  supabase: any,
  openai: OpenAI,
  videoId: string,
  searchChunks: UapSearchChunk[],
  chatChunks: UapChatChunk[],
): Promise<EmbedUapResult> {
  // Clean up existing embeddings (supports re-processing)
  await supabase.from('uap_punctuated_embeddings').delete().eq('video_id', videoId);
  await supabase.from('uap_chatbot_chunks').delete().eq('video_id', videoId);

  let searchInserted = 0;
  let chatInserted = 0;

  // 1. Search embeddings → uap_punctuated_embeddings
  if (searchChunks.length > 0) {
    const searchTexts = searchChunks.map(c => c.content);
    const searchEmbeddings = await batchEmbed(openai, searchTexts);

    for (let i = 0; i < searchChunks.length; i++) {
      const embedding = searchEmbeddings[i];
      if (!embedding) continue;

      const { error } = await supabase
        .from('uap_punctuated_embeddings')
        .insert({
          video_id: videoId,
          content: searchChunks[i].content,
          start_time: searchChunks[i].start_time,
          embedding: `[${embedding.join(',')}]`,
        });

      if (error) {
        const msg = (error.message || '').replace(/\s+/g, ' ').slice(0, 200);
        throw new Error(`Failed to insert search embedding ${i} for ${videoId}: ${msg}`);
      }
      searchInserted++;

      // Brief pause to avoid overwhelming the connection pool
      if (i < searchChunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    console.log(`[UAP-Embed] Inserted ${searchInserted} search chunks for ${videoId}`);
  }

  // 2. Chat embeddings → uap_chatbot_chunks
  if (chatChunks.length > 0) {
    const chatTexts = chatChunks.map(c => c.content);
    const chatEmbeddings = await batchEmbed(openai, chatTexts);

    for (let i = 0; i < chatChunks.length; i++) {
      const embedding = chatEmbeddings[i];
      if (!embedding) continue;

      const { error } = await supabase
        .from('uap_chatbot_chunks')
        .insert({
          video_id: videoId,
          content: chatChunks[i].content,
          embedding: `[${embedding.join(',')}]`,
          metadata: chatChunks[i].metadata,
        });

      if (error) {
        throw new Error(`Failed to insert chat chunk ${i} for ${videoId}: ${error.message}`);
      }
      chatInserted++;

      if (i < chatChunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    console.log(`[UAP-Embed] Inserted ${chatInserted} chat chunks for ${videoId}`);
  }

  return {
    videoId,
    searchChunksInserted: searchInserted,
    chatChunksInserted: chatInserted,
  };
}

// ─── Batch Embed Helper ──────────────────────────────────────────────────────

/**
 * Batch generate embeddings using OpenAI's text-embedding-3-small.
 * Mirrors NDE intake.ts batchEmbed — processes in batches of 100.
 */
export async function batchEmbed(
  openai: OpenAI,
  texts: string[],
): Promise<(number[] | null)[]> {
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
      console.error(`[UAP-Embed] Error embedding batch ${i}-${i + batch.length}:`, error);
      // Leave as null — individual failures don't stop the pipeline
    }
  }

  return results;
}
