/**
 * UAP Chat Chunk Pipeline
 *
 * Copy-Modify from: src/lib/pipeline/intake.ts (chat embedding section, lines 702-726)
 *                    src/lib/youtube/transcript-processor.ts (createChatChunks)
 * Module: Reuses punctuate-uap.ts for chunking + embed-uap.ts for embedding
 *
 * Generates chat-specific chunks and embeddings for UAP videos.
 * This script processes videos that are already embedded but may need
 * chat chunks regenerated, OR can be run as a standalone pipeline step.
 *
 * Chat chunks are smaller (256 tokens / ~1000 chars) and optimized for
 * RAG retrieval in the compassionate chat interface.
 *
 * - Tier 3 gate enforced
 * - Processes Tier 1+2 videos with punctuated subtitles
 * - Inserts into uap_chatbot_chunks table
 *
 * Usage: npx tsx scripts/uap-batch-chat-chunks.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { shouldSkipVideo } from '../src/lib/pipeline/punctuate-uap';
import { batchEmbed } from '../src/lib/pipeline/embed-uap';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;
const MAX_VIDEOS_PER_RUN = 200;

// ─── Chat Chunk Config ───────────────────────────────────────────────────────

const CHAT_CHUNK_TARGET_SIZE = 1000; // ~256 tokens
const CHAT_CHUNK_OVERLAP = 100;

// ─── Chat Chunking Logic ─────────────────────────────────────────────────────

interface ChatChunk {
  content: string;
  metadata: {
    video_id: string;
    chunk_index: number;
    char_start: number;
    char_end: number;
  };
}

function createChatChunks(
  text: string,
  videoId: string,
  targetSize: number = CHAT_CHUNK_TARGET_SIZE,
): ChatChunk[] {
  const chunks: ChatChunk[] = [];
  const overlap = CHAT_CHUNK_OVERLAP;
  let position = 0;
  let chunkIndex = 0;

  while (position < text.length) {
    let end = Math.min(position + targetSize, text.length);

    // Try to break at a sentence boundary
    if (end < text.length) {
      const searchRange = text.substring(end - 100, end + 50);
      const sentenceBreak = searchRange.lastIndexOf('. ');
      if (sentenceBreak > 0) {
        end = (end - 100) + sentenceBreak + 2;
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
          char_end: end,
        },
      });
      chunkIndex++;
    }

    position = end - overlap;
    if (position >= text.length - overlap) break;
  }

  return chunks;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Find videos with punctuated text but no chat chunks
  // Check by querying uap_chatbot_chunks for missing video_ids
  const { data: videosWithChunks } = await supabase
    .from('uap_chatbot_chunks')
    .select('video_id')
    .limit(10000);

  const existingVideoIds = new Set(
    (videosWithChunks || []).map((r: { video_id: string }) => r.video_id)
  );

  // Get all punctuated Tier 1+2 videos
  const { data: allVideos, error } = await supabase
    .from('uap_vids')
    .select('video_id, title, tier, intake_status, subtitles_punctuated')
    .not('subtitles_punctuated', 'is', null)
    .neq('intake_status', 'out_of_scope')
    .order('created_at', { ascending: true })
    .limit(MAX_VIDEOS_PER_RUN);

  if (error) {
    console.error('❌ Error fetching videos:', error.message);
    process.exit(1);
  }

  // Filter to only videos without existing chat chunks
  const videos = (allVideos || []).filter(
    (v: { video_id: string }) => !existingVideoIds.has(v.video_id)
  );

  console.log(`\n📊 UAP Chat Chunks Status:`);
  console.log(`   Total with punctuated text: ${allVideos?.length ?? 0}`);
  console.log(`   Already have chat chunks: ${existingVideoIds.size}`);
  console.log(`   Pending: ${videos.length}`);
  console.log(`   Max this run: ${MAX_VIDEOS_PER_RUN}\n`);

  if (videos.length === 0) {
    console.log('✅ All videos already have chat chunks. Nothing to do.');
    return;
  }

  console.log(`🚀 Processing ${videos.length} videos in batches of ${BATCH_SIZE}...\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let totalChunks = 0;

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);

    for (const video of batch) {
      try {
        // Tier 3 gate
        if (shouldSkipVideo(video.tier, video.intake_status)) {
          skipped++;
          continue;
        }

        if (!video.subtitles_punctuated || video.subtitles_punctuated.length < 50) {
          console.log(`  ⚠️ ${video.video_id}: Transcript too short, skipping`);
          skipped++;
          continue;
        }

        // Create chat chunks
        const chunks = createChatChunks(video.subtitles_punctuated, video.video_id);

        if (chunks.length === 0) {
          console.log(`  ⚠️ ${video.video_id}: No chunks generated, skipping`);
          skipped++;
          continue;
        }

        // Generate embeddings
        const chatTexts = chunks.map(c => c.content);
        const chatEmbeddings = await batchEmbed(openai, chatTexts);

        // Delete existing chat chunks for this video (re-processing support)
        await supabase.from('uap_chatbot_chunks').delete().eq('video_id', video.video_id);

        // Insert 1 row at a time (pgvector size constraints)
        let inserted = 0;
        for (let j = 0; j < chunks.length; j++) {
          const embedding = chatEmbeddings[j];
          if (!embedding) continue;

          const { error: insertError } = await supabase
            .from('uap_chatbot_chunks')
            .insert({
              video_id: video.video_id,
              content: chunks[j].content,
              embedding: `[${embedding.join(',')}]`,
              metadata: chunks[j].metadata,
            });

          if (insertError) {
            throw new Error(`Insert failed for chunk ${j}: ${insertError.message}`);
          }
          inserted++;

          if (j < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 100));
          }
        }

        processed++;
        totalChunks += inserted;
        console.log(`  ✅ ${video.video_id}: ${inserted} chat chunks inserted`);
      } catch (err: any) {
        errors++;
        console.error(`  ❌ ${video.video_id}: ${err.message}`);
      }
    }

    // Progress checkpoint
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${videos.length} done | ` +
      `Chunks:${totalChunks} | Skipped:${skipped} Errors:${errors}`
    );

    // Rate limit delay
    if (i + BATCH_SIZE < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Chat chunks complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Total chat chunks inserted: ${totalChunks}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
