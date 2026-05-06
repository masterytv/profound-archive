/**
 * UAP Punctuation Pipeline
 *
 * Copy-Modify from: src/lib/youtube/transcript-processor.ts (chunking logic)
 *                    src/lib/pipeline/intake.ts (punctuation section, lines 230-236)
 *
 * Processes raw_timestamped_subtitles from uap_vids into:
 *   1. subtitles_punctuated — full text for AI analysis
 *   2. subtitles_cleaned — plain text for chat
 *   3. Search chunks — ~500 char chunks with start_time for uap_punctuated_embeddings
 *   4. Chat chunks — ~1000 char chunks for uap_chatbot_chunks
 *
 * Design: Pure function, called from batch script or future API route.
 * Tier 3 gate: refuses to process out_of_scope videos.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UapSearchChunk {
  content: string;
  start_time: number;
}

export interface UapChatChunk {
  content: string;
  metadata: {
    video_id: string;
    chunk_index: number;
    char_start: number;
    char_end: number;
  };
}

export interface UapPunctuationResult {
  videoId: string;
  punctuated: string;
  cleaned: string;
  searchChunks: UapSearchChunk[];
  chatChunks: UapChatChunk[];
}

// ─── Tier Gate ────────────────────────────────────────────────────────────────

/**
 * Returns true if the video should be skipped (Tier 3 / out_of_scope).
 */
export function shouldSkipVideo(tier: number | null, intakeStatus: string | null): boolean {
  if (tier === 3) return true;
  if (intakeStatus === 'out_of_scope') return true;
  return false;
}

// ─── Main Punctuation Function ───────────────────────────────────────────────

/**
 * Process raw_timestamped_subtitles JSONB into punctuated text and chunks.
 *
 * The NDE pipeline uses transcript-processor.ts which joins CaptionSegment[]
 * with spaces. UAP videos store raw subtitles in the same JSONB format
 * (array of { text, start, duration }), so we apply the same logic.
 *
 * @param videoId - The video_id from uap_vids
 * @param rawSubtitles - The raw_timestamped_subtitles JSONB value
 * @returns UapPunctuationResult or null if no valid subtitles
 */
export function punctuateUapTranscript(
  videoId: string,
  rawSubtitles: unknown,
): UapPunctuationResult | null {
  // Parse the JSONB subtitles into segments
  const segments = parseRawSubtitles(rawSubtitles);
  if (segments.length === 0) {
    console.log(`[UAP-Punctuate] No subtitle segments for ${videoId}`);
    return null;
  }

  // 1. Full punctuated text — join all segment text with spaces (mirrors NDE pattern)
  const punctuated = segments
    .map(s => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!punctuated || punctuated.length < 50) {
    console.log(`[UAP-Punctuate] Transcript too short for ${videoId} (${punctuated.length} chars)`);
    return null;
  }

  // 2. Cleaned text is the same as punctuated (YouTube captions don't embed timestamps in text)
  const cleaned = punctuated;

  // 3. Search chunks — ~500 char chunks preserving timestamp alignment
  const searchChunks = createSearchChunks(segments, 500);

  // 4. Chat chunks — ~1000 char chunks from clean text
  const chatChunks = createChatChunks(cleaned, videoId, 1000);

  console.log(
    `[UAP-Punctuate] ✅ ${videoId}: ${punctuated.length} chars, ` +
    `${searchChunks.length} search chunks, ${chatChunks.length} chat chunks`
  );

  return {
    videoId,
    punctuated,
    cleaned,
    searchChunks,
    chatChunks,
  };
}

// ─── Subtitle Parsing ────────────────────────────────────────────────────────

interface ParsedSegment {
  text: string;
  start: number;
  duration: number;
}

/**
 * Parse raw_timestamped_subtitles JSONB into typed segments.
 * Handles both array-of-objects and plain string formats.
 */
function parseRawSubtitles(raw: unknown): ParsedSegment[] {
  if (!raw) return [];

  // Array of { text, start, duration } or { text, offset, duration }
  if (Array.isArray(raw)) {
    return raw
      .map((seg: Record<string, unknown>) => ({
        text: String(seg.text || '').trim(),
        start: Number(seg.start ?? seg.offset ?? 0),
        duration: Number(seg.duration ?? 0),
      }))
      .filter(seg => seg.text.length > 0);
  }

  // Plain string — wrap in a single segment (no timestamp info)
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [{ text: raw.trim(), start: 0, duration: 0 }];
  }

  return [];
}

// ─── Chunking (mirrors transcript-processor.ts) ──────────────────────────────

/**
 * Create search-optimized chunks that preserve timestamp alignment.
 * Each chunk maps to a specific point in the video.
 */
function createSearchChunks(
  segments: ParsedSegment[],
  targetSize: number = 500,
): UapSearchChunk[] {
  const chunks: UapSearchChunk[] = [];
  let currentText = '';
  let currentStart = 0;

  for (const segment of segments) {
    if (currentText.length === 0) {
      currentStart = segment.start;
    }

    currentText += (currentText ? ' ' : '') + segment.text;

    if (currentText.length >= targetSize) {
      chunks.push({
        content: currentText.trim(),
        start_time: currentStart,
      });
      currentText = '';
    }
  }

  // Emit final chunk
  if (currentText.trim()) {
    chunks.push({
      content: currentText.trim(),
      start_time: currentStart,
    });
  }

  return chunks;
}

/**
 * Create chat-optimized chunks from clean text.
 * Splits on sentence boundaries near target size with ~100 char overlap.
 */
function createChatChunks(
  text: string,
  videoId: string,
  targetSize: number = 1000,
): UapChatChunk[] {
  const chunks: UapChatChunk[] = [];
  const overlap = 100;
  let position = 0;
  let chunkIndex = 0;

  while (position < text.length) {
    let end = Math.min(position + targetSize, text.length);

    // Try to break at a sentence boundary (. ! ? followed by space)
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

    // Move forward with overlap for context continuity
    position = end - overlap;
    if (position >= text.length - overlap) break;
  }

  return chunks;
}
