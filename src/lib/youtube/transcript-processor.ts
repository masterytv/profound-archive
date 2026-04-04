/**
 * Transcript Processor
 * 
 * Transforms raw YouTube caption segments into the various formats
 * needed by the application:
 * 
 * 1. raw_timestamped_subtitles   → Raw JSON for timestamped search
 * 2. subtitles_punctuated        → Clean full text for AI analysis
 * 3. subtitles_cleaned           → Plain text without timestamps for chat
 * 4. Search chunks               → ~500 char chunks with start_time for nde_punctuated_embeddings
 * 5. Chat chunks                 → ~1000 char chunks without timestamps for nde_chatbot_chunks
 */

import type { CaptionSegment } from './subtitles';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessedTranscripts {
    /** Raw caption segments as JSON — stored in nde_vids.raw_timestamped_subtitles */
    rawTimestamped: CaptionSegment[];

    /** Full punctuated text — stored in nde_vids.subtitles_punctuated, used by AI analysis */
    punctuated: string;

    /** Clean text without timestamps — stored in nde_vids.subtitles_cleaned, used by chat */
    cleaned: string;

    /** Chunks with timestamps for keyword search — stored in nde_punctuated_embeddings */
    searchChunks: SearchChunk[];

    /** Chunks without timestamps for RAG chat — stored in nde_chatbot_chunks */
    chatChunks: ChatChunk[];
}

export interface SearchChunk {
    content: string;
    start_time: number;
}

export interface ChatChunk {
    content: string;
    metadata: {
        video_id: string;
        chunk_index: number;
        char_start: number;
        char_end: number;
    };
}

// ─── Main Processor ──────────────────────────────────────────────────────────

/**
 * Process raw caption segments into all required transcript formats.
 * 
 * Why derive instead of fetch separately:
 * - Single data source → no inconsistency between timestamped and clean versions
 * - Saves an API call
 * - We keep the raw JSON and generate all derivations from it
 */
export function processTranscripts(
    segments: CaptionSegment[],
    videoId: string
): ProcessedTranscripts {
    // 1. Full punctuated text — join all segment text with spaces
    const punctuated = segments
        .map(s => s.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 2. Cleaned text is the same as punctuated for our purposes
    // (YouTube captions don't have timestamps in the text itself)
    const cleaned = punctuated;

    // 3. Search chunks — smaller chunks (~500 chars) preserving timestamp alignment
    const searchChunks = createSearchChunks(segments, 500);

    // 4. Chat chunks — larger chunks (~1000 chars) from the clean text
    const chatChunks = createChatChunks(cleaned, videoId, 1000);

    return {
        rawTimestamped: segments,
        punctuated,
        cleaned,
        searchChunks,
        chatChunks,
    };
}

// ─── Chunking Logic ──────────────────────────────────────────────────────────

/**
 * Create search-optimized chunks that preserve timestamp alignment.
 * Each chunk maps to a specific point in the video.
 * 
 * Strategy: Accumulate segments until we hit ~targetSize characters,
 * then start a new chunk. Each chunk's start_time is the first segment's start.
 */
function createSearchChunks(
    segments: CaptionSegment[],
    targetSize: number = 500
): SearchChunk[] {
    const chunks: SearchChunk[] = [];
    let currentText = '';
    let currentStart = 0;

    for (const segment of segments) {
        if (currentText.length === 0) {
            currentStart = segment.start;
        }

        currentText += (currentText ? ' ' : '') + segment.text;

        // When we've accumulated enough text, emit a chunk
        if (currentText.length >= targetSize) {
            chunks.push({
                content: currentText.trim(),
                start_time: currentStart,
            });
            currentText = '';
        }
    }

    // Don't forget the last chunk
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
 * These are used for RAG retrieval in the compassionate chat.
 * 
 * Strategy: Split on sentence boundaries near the target size.
 * Overlap by ~100 chars to preserve context across chunk boundaries.
 */
function createChatChunks(
    text: string,
    videoId: string,
    targetSize: number = 1000
): ChatChunk[] {
    const chunks: ChatChunk[] = [];
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
                end = (end - 100) + sentenceBreak + 2; // +2 to include ". "
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

        // Move forward, with overlap for context continuity
        position = end - overlap;
        if (position >= text.length - overlap) break; // Prevent infinite loop on tiny remainders
    }

    return chunks;
}
