/**
 * YouTube Subtitle/Caption Fetcher — Bright Data provider.
 *
 * Replaces Supadata as the primary transcript source (2026-07: Supadata's free
 * tier dropped to 100 calls/month and the paid plan is $17/mo; Bright Data's
 * YouTube "Videos by URL" scraper returns timestamped transcripts at
 * ~$0.75–1.50 per 1,000 records with a free monthly allowance).
 *
 * API model: this is a scrape-JOB API, not a live endpoint —
 *   1. POST /datasets/v3/trigger  → { snapshot_id }   (job queued)
 *   2. GET  /datasets/v3/snapshot/{id} → 202 while running, 200 with records
 *
 * ── Snapshot resume (2026-07-09) ─────────────────────────────────────────────
 * Verified in production: the scrape itself takes 10s–4min, but jobs can sit
 * in Bright Data's QUEUE for 15+ minutes — and they NEVER die; a "slow" job
 * always completes and stays downloadable. Re-triggering on timeout therefore
 * puts a brand-new job at the back of their queue (one video re-triggered 4×
 * in a row this way, wasting an hour and 4 records). Instead, pending
 * snapshot IDs are persisted to logs/brightdata-pending-jobs.json (shared by
 * the pm2 worker AND the fresh-process crontab ticks on the Oracle VM); a
 * retry for the same video resumes polling the EXISTING snapshot — usually an
 * instant hit. A timeout here is thus "still cooking, retry later", which the
 * queue layers already handle via caption_fetch_failed.
 *
 * The record's `formatted_transcript` is an array of
 *   { start_time, end_time, duration, text }   (times in MILLISECONDS)
 * which maps 1:1 onto CaptionSegment. The record also carries full video
 * metadata (views, subscribers, title, date_posted) — unused here, but a
 * future option to reduce YouTube Data API quota.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { logQuota } from '@/lib/ai/usage-tracker';
import type { CaptionFetchResult, CaptionSegment, CaptionFailureReason } from './subtitles';

const DATASET_ID = 'gd_lk56epmy2i5g7lzu0k'; // Bright Data "YouTube Videos by URL"
const BASE = 'https://api.brightdata.com/datasets/v3';
const POLL_INTERVAL_MS = 20_000;
// One attempt waits 8 min. Longer buys little: if the job outlives this
// window it keeps cooking at Bright Data and the NEXT attempt resumes it.
const JOB_TIMEOUT_MS = 8 * 60_000;
// Pending snapshots older than this are considered stale → fresh trigger.
const PENDING_MAX_AGE_MS = 24 * 60 * 60_000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrightDataTranscriptEntry {
    start_time: number; // ms
    end_time: number;   // ms
    duration: number;   // ms
    text: string;
}

interface BrightDataRecord {
    video_id?: string;
    title?: string;
    transcript?: string | null;
    formatted_transcript?: BrightDataTranscriptEntry[] | null;
    /** Sometimes a plain code ("en"), sometimes an object like { code, name }. */
    transcript_language?: string | { code?: string; name?: string } | null;
    error?: string;
    error_code?: string;
}

type PendingJobs = Record<string, { snapshotId: string; triggeredAt: number }>;

// ─── Pending-job persistence (survives process boundaries on the same host) ──

const PENDING_FILE = path.join(process.cwd(), 'logs', 'brightdata-pending-jobs.json');

function loadPendingJobs(): PendingJobs {
    try {
        return JSON.parse(readFileSync(PENDING_FILE, 'utf8')) as PendingJobs;
    } catch {
        return {}; // missing/corrupt file → no pending jobs; degrades to fresh triggers
    }
}

function savePendingJobs(jobs: PendingJobs): void {
    try {
        mkdirSync(path.dirname(PENDING_FILE), { recursive: true });
        writeFileSync(PENDING_FILE, JSON.stringify(jobs, null, 2));
    } catch (error: any) {
        // Persistence is an optimization — never let it break caption fetching.
        console.warn(`[BrightData] Could not persist pending jobs: ${error?.message || error}`);
    }
}

function rememberJob(videoId: string, snapshotId: string): void {
    const jobs = loadPendingJobs();
    jobs[videoId] = { snapshotId, triggeredAt: Date.now() };
    savePendingJobs(jobs);
}

function forgetJob(videoId: string): void {
    const jobs = loadPendingJobs();
    if (videoId in jobs) {
        delete jobs[videoId];
        savePendingJobs(jobs);
    }
}

function pendingSnapshotFor(videoId: string): string | null {
    const entry = loadPendingJobs()[videoId];
    if (!entry) return null;
    if (Date.now() - entry.triggeredAt > PENDING_MAX_AGE_MS) {
        forgetJob(videoId);
        return null;
    }
    return entry.snapshotId;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(
    reason: CaptionFailureReason,
    retryable: boolean,
    message: string,
): CaptionFetchResult {
    return { success: false, retryable, failureReason: reason, message };
}

function languageOf(record: BrightDataRecord): string {
    const lang = record.transcript_language;
    if (typeof lang === 'string' && lang) return lang;
    if (lang && typeof lang === 'object') return lang.code || lang.name || 'en';
    return 'en';
}

/** Same entity decoding as the Supadata path — caption text carries HTML entities. */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\n/g, ' ')
        .trim();
}

// ─── Snapshot polling ────────────────────────────────────────────────────────

type PollOutcome =
    | { kind: 'done'; result: CaptionFetchResult }
    | { kind: 'timeout' }
    | { kind: 'gone' }; // snapshot 4xx — stale/expired, caller should re-trigger

/**
 * Poll one snapshot until ready or deadline. `immediateFirstPoll` is used when
 * resuming a job from a previous attempt — it has usually finished by now.
 */
async function pollSnapshot(
    apiKey: string,
    snapshotId: string,
    videoId: string,
    immediateFirstPoll: boolean,
): Promise<PollOutcome> {
    const deadline = Date.now() + JOB_TIMEOUT_MS;
    let first = true;

    while (Date.now() < deadline) {
        if (!(first && immediateFirstPoll)) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
        first = false;

        let res: Response;
        let body: string;
        try {
            res = await fetch(`${BASE}/snapshot/${snapshotId}?format=json`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            body = await res.text();
        } catch (error: any) {
            // Transient network hiccup mid-poll — keep polling until deadline
            console.warn(`[BrightData] Poll error for ${videoId} (will retry): ${error?.message || error}`);
            continue;
        }

        if (res.status === 202) continue; // still running

        if (res.status >= 400 && res.status < 500) {
            console.warn(`[BrightData] Snapshot ${snapshotId} gone (HTTP ${res.status}) for ${videoId} — will re-trigger`);
            return { kind: 'gone' };
        }

        if (res.status !== 200) {
            console.error(`[BrightData] Snapshot fetch failed (HTTP ${res.status}) for ${videoId}: ${body.slice(0, 150)}`);
            return { kind: 'done', result: fail('server_error', true, `Snapshot failed (HTTP ${res.status}): ${body.slice(0, 100)}`) };
        }

        // ── Ready: map the record onto CaptionResult ─────────────────────────
        let records: BrightDataRecord[];
        try {
            const parsed = JSON.parse(body);
            records = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return { kind: 'done', result: fail('parse_error', true, `Non-JSON snapshot body: ${body.slice(0, 80)}`) };
        }

        const record = records[0];
        if (!record) {
            return { kind: 'done', result: fail('no_captions', false, 'Snapshot returned no records') };
        }
        if (record.error) {
            // Scrape-level failure (page unavailable, region lock, etc.) — retryable
            // unless the video is plainly gone; we can't reliably distinguish, so
            // treat as retryable and let the queue's retry budget decide.
            console.error(`[BrightData] Record error for ${videoId}: ${record.error} (${record.error_code ?? 'no code'})`);
            return { kind: 'done', result: fail('unknown', true, `Bright Data record error: ${String(record.error).slice(0, 120)}`) };
        }

        const ft = record.formatted_transcript;
        if (!Array.isArray(ft) || ft.length === 0) {
            console.log(`[BrightData] No transcript for ${videoId} — video has no captions.`);
            return { kind: 'done', result: fail('no_captions', false, 'No formatted_transcript in record') };
        }

        const segments: CaptionSegment[] = ft
            .map(seg => ({
                text: decodeHtmlEntities((seg.text || '').trim()),
                start: (seg.start_time ?? 0) / 1000,
                duration: (seg.duration ?? Math.max(0, (seg.end_time ?? 0) - (seg.start_time ?? 0))) / 1000,
            }))
            .filter(seg => seg.text.length > 0);

        if (segments.length === 0) {
            return { kind: 'done', result: fail('no_captions', false, 'Transcript entries were all empty') };
        }

        console.log(`[BrightData] ✅ ${segments.length} segments for ${videoId} (lang: ${languageOf(record)})`);

        // 1 record consumed per successful scrape.
        void logQuota({ provider: 'brightdata', operation: 'brightdata.transcript', quantity: 1, metadata: { videoId } });

        return {
            kind: 'done',
            result: {
                success: true,
                retryable: false,
                data: {
                    segments,
                    language: languageOf(record),
                    isAutoGenerated: true, // Bright Data doesn't distinguish; assume auto
                },
            },
        };
    }

    return { kind: 'timeout' };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Fetch timestamped captions for a YouTube video via Bright Data.
 * Same contract as the Supadata fetchCaptions — callers switch on
 * `.success` / `.retryable` / `.failureReason` and never see provider details.
 *
 * A `timeout` failure means "job still queued at Bright Data" — it is kept in
 * the pending-jobs file and the next attempt for this video resumes it.
 */
export async function fetchCaptionsBrightData(videoId: string): Promise<CaptionFetchResult> {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    if (!apiKey) {
        return fail('missing_api_key', false, 'BRIGHTDATA_API_KEY not set');
    }

    // ── 0. Resume a pending job from a previous attempt, if any ─────────────
    const existing = pendingSnapshotFor(videoId);
    if (existing) {
        console.log(`[BrightData] Resuming pending snapshot ${existing} for ${videoId}...`);
        const outcome = await pollSnapshot(apiKey, existing, videoId, true);
        if (outcome.kind === 'done') {
            forgetJob(videoId);
            return outcome.result;
        }
        if (outcome.kind === 'timeout') {
            console.warn(`[BrightData] Resumed snapshot for ${videoId} still not ready after ${JOB_TIMEOUT_MS / 60000}min — keeping for next attempt`);
            return fail('timeout', true, `Bright Data job still running (resumed snapshot ${existing})`);
        }
        // 'gone' — stale snapshot; drop it and trigger fresh below.
        forgetJob(videoId);
    }

    // ── 1. Trigger a new scrape job ──────────────────────────────────────────
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[BrightData] Triggering transcript job for ${videoId}...`);

    let snapshotId: string;
    try {
        const res = await fetch(
            `${BASE}/trigger?dataset_id=${DATASET_ID}&include_errors=true&format=json`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify([{ url: videoUrl }]),
            },
        );
        const body = await res.text();

        if (res.status === 401 || res.status === 403) {
            console.error(`[BrightData] AUTH ERROR (${res.status}) for ${videoId} — check BRIGHTDATA_API_KEY.`);
            return fail('auth_error', false, `Bright Data auth error (${res.status})`);
        }
        if (res.status === 429) {
            return fail('rate_limited', true, `Bright Data rate limited (429): ${body.slice(0, 100)}`);
        }
        if (!res.ok) {
            console.error(`[BrightData] Trigger failed (HTTP ${res.status}) for ${videoId}: ${body.slice(0, 150)}`);
            return fail(res.status >= 500 ? 'server_error' : 'unknown', true, `Trigger failed (HTTP ${res.status}): ${body.slice(0, 100)}`);
        }

        let parsed: { snapshot_id?: string };
        try {
            parsed = JSON.parse(body);
        } catch {
            return fail('parse_error', true, `Non-JSON trigger response: ${body.slice(0, 80)}`);
        }
        if (!parsed.snapshot_id) {
            return fail('unknown', true, `Trigger response missing snapshot_id: ${body.slice(0, 100)}`);
        }
        snapshotId = parsed.snapshot_id;
    } catch (error: any) {
        console.error(`[BrightData] Trigger error for ${videoId}:`, error?.message || error);
        return fail('unknown', true, error?.message || String(error));
    }

    // Remember the job BEFORE polling — if this process dies or times out,
    // the next attempt resumes the snapshot instead of re-queueing at BD.
    rememberJob(videoId, snapshotId);

    // ── 2. Poll until ready or timeout ───────────────────────────────────────
    const outcome = await pollSnapshot(apiKey, snapshotId, videoId, false);
    if (outcome.kind === 'done') {
        forgetJob(videoId);
        return outcome.result;
    }
    if (outcome.kind === 'gone') {
        // Freshly triggered snapshot vanished — genuine provider fault.
        forgetJob(videoId);
        return fail('server_error', true, `Bright Data snapshot ${snapshotId} disappeared after trigger`);
    }

    console.warn(`[BrightData] Job for ${videoId} not ready after ${JOB_TIMEOUT_MS / 60000}min — snapshot ${snapshotId} kept for resume on next attempt`);
    return fail('timeout', true, `Bright Data job timed out after ${JOB_TIMEOUT_MS / 60000} minutes (snapshot ${snapshotId} pending)`);
}
