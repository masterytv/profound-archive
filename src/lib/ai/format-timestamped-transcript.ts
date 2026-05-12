/**
 * Timestamped Transcript Formatter
 *
 * Converts raw_timestamped_subtitles JSONB (YouTube caption segments with
 * start/end seconds) into a human-readable [M:SS] format that LLMs can parse
 * for timestamp extraction.
 *
 * This enables the LLM to return `timestamp_seconds` alongside extracted
 * quotes, which the UI renders as clickable TimestampLink components.
 *
 * Proven pattern from the NDE pipeline's extractPullQuote() — see
 * src/app/video/[id]/page.tsx L156-L194.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimestampedSegment {
  start: number;  // seconds (e.g., 45.2)
  end: number;    // seconds (e.g., 48.7)
  text: string;   // spoken words in that window
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format seconds into M:SS display (e.g., 125 → "2:05").
 */
export function formatTimestamp(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Safely extracts the segment array from raw_timestamped_subtitles JSONB.
 *
 * Handles three storage shapes:
 *   Shape A: { data: [...segments] }      — pipeline standard
 *   Shape B: [...segments]                — some older rows
 *   Shape C: a JSON string (double-encoded) — defensive
 */
export function extractSegments(raw: unknown): TimestampedSegment[] | null {
  if (!raw) return null;

  // Shape C: string — try parsing first
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return null; }
  }

  // Shape A: { data: [...] }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Array.isArray((parsed as Record<string, unknown>).data)
  ) {
    return (parsed as { data: TimestampedSegment[] }).data;
  }

  // Shape B: plain array
  if (Array.isArray(parsed)) {
    return parsed as TimestampedSegment[];
  }

  return null;
}

// ─── Main Formatter ──────────────────────────────────────────────────────────

/**
 * Converts raw_timestamped_subtitles into a [seconds]-prefixed transcript string
 * for LLM consumption.
 *
 * Uses raw integer seconds (not M:SS) so the LLM can copy the number directly
 * into timestamp_seconds fields without needing to do M:SS → seconds math.
 * This avoids hallucinated timestamps that exceed video duration.
 *
 * Example output:
 *   [0] Hello everyone today we're going to talk about
 *   [12] the incident at Wright-Patterson Air Force Base
 *   [45] David Grusch stated under oath that he was told
 *
 * @param rawTimestamped The raw_timestamped_subtitles JSONB value from the DB
 * @returns Formatted string, or null if segments are unavailable
 */
export function formatTimestampedTranscript(rawTimestamped: unknown): string | null {
  const segments = extractSegments(rawTimestamped);
  if (!segments || segments.length === 0) return null;

  const lines: string[] = [];

  for (const seg of segments) {
    // Skip non-speech markers like [Music], [Applause], etc.
    if (!seg.text || seg.text.startsWith('[')) continue;

    const seconds = Math.floor(seg.start);
    lines.push(`[${seconds}] ${seg.text.trim()}`);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
