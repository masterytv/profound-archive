/**
 * warm-questions.ts
 *
 * Pre-populates question_synthesis for all active curated questions by calling
 * the /api/questions/[slug] endpoint for each uncached question.
 *
 * Usage:
 *   npx tsx scripts/warm-questions.ts
 *   npx tsx scripts/warm-questions.ts --url https://projectprofound.org   # production
 *   npx tsx scripts/warm-questions.ts --concurrency 2                     # 2 at a time (careful with rate limits)
 *   npx tsx scripts/warm-questions.ts --dry-run                           # list uncached, don't fetch
 *
 * Safety:
 *   - Skips questions already in question_synthesis (idempotent — safe to re-run)
 *   - Default concurrency = 1 (sequential) to avoid hammering OpenRouter
 *   - Each request has a 120s timeout (matches the API route's Claude timeout)
 *   - Failed questions are logged and skipped; they can be retried on the next run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL     = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
                  ?? 'http://localhost:3000';
const CONCURRENCY  = parseInt(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '1', 10);
const DRY_RUN      = process.argv.includes('--dry-run');
const DELAY_MS     = 2_000;   // pause between sequential requests (be kind to OpenRouter)
const TIMEOUT_MS   = 120_000; // 120s — matches Claude timeout in route.ts

// ─── Supabase (service key — reads question_synthesis + nde_questions) ────────

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(n: number, total: number) {
    return String(n).padStart(String(total).length, ' ');
}

async function warmQuestion(slug: string, index: number, total: number): Promise<'ok' | 'error' | 'no_results'> {
    const label = `[${pad(index, total)}/${total}] ${slug}`;
    const url   = `${BASE_URL}/api/questions/${encodeURIComponent(slug)}`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) {
            console.error(`  ❌ ${label} — HTTP ${res.status}`);
            return 'error';
        }

        const json = await res.json() as Record<string, unknown>;

        if (json.no_results) {
            console.warn(`  ⚠️  ${label} — no NDE results found (question may need better HyDE)`);
            return 'no_results';
        }

        if (!json.answer || !Array.isArray((json.answer as Record<string, unknown>).paragraphs)) {
            console.error(`  ❌ ${label} — malformed response (no paragraphs)`);
            return 'error';
        }

        const paraCount = ((json.answer as Record<string, unknown>).paragraphs as unknown[]).length;
        console.log(`  ✅ ${label} — ${paraCount} paragraphs`);
        return 'ok';

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ ${label} — ${msg}`);
        return 'error';
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  Project Profound — Question Warm-Up    │');
    console.log('└─────────────────────────────────────────┘');
    console.log(`  Target : ${BASE_URL}`);
    console.log(`  Mode   : ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Workers: ${CONCURRENCY}`);
    console.log('');

    // 1. Fetch all active question slugs
    const { data: questions, error: qErr } = await supabase
        .from('nde_questions')
        .select('id, slug, consumer_question')
        .eq('is_active', true)
        .order('slug');

    if (qErr || !questions) {
        console.error('Failed to fetch questions:', qErr?.message);
        process.exit(1);
    }

    // 2. Fetch already-cached IDs (with valid cited_video_ids — meaning full write)
    const { data: cached } = await supabase
        .from('question_synthesis')
        .select('question_id, cited_video_ids')
        .not('cited_video_ids', 'eq', '{}');

    const cachedIds = new Set((cached ?? []).map(r => r.question_id));

    const pending = questions.filter(q => !cachedIds.has(q.id));
    const already = questions.length - pending.length;

    console.log(`  Total questions : ${questions.length}`);
    console.log(`  Already cached  : ${already}`);
    console.log(`  To warm         : ${pending.length}`);
    console.log('');

    if (pending.length === 0) {
        console.log('  🎉 All questions already cached. Nothing to do.');
        return;
    }

    if (DRY_RUN) {
        console.log('  Pending questions (--dry-run, no fetches made):');
        pending.forEach((q, i) => console.log(`    ${pad(i + 1, pending.length)}. ${q.slug}`));
        return;
    }

    // 3. Warm pending questions
    const total   = pending.length;
    let succeeded = 0;
    let failed    = 0;
    let noResults = 0;

    const startMs = Date.now();

    if (CONCURRENCY === 1) {
        // Sequential — safest for rate limits
        for (let i = 0; i < pending.length; i++) {
            const q      = pending[i];
            const result = await warmQuestion(q.slug, i + 1, total);
            if (result === 'ok')         succeeded++;
            else if (result === 'error') failed++;
            else                         noResults++;

            // Delay between requests (skip after last)
            if (i < pending.length - 1) await sleep(DELAY_MS);
        }
    } else {
        // Concurrent — process CONCURRENCY at a time
        for (let i = 0; i < pending.length; i += CONCURRENCY) {
            const batch = pending.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map((q, j) => warmQuestion(q.slug, i + j + 1, total))
            );
            results.forEach(r => {
                if (r === 'ok')         succeeded++;
                else if (r === 'error') failed++;
                else                    noResults++;
            });
            if (i + CONCURRENCY < pending.length) await sleep(DELAY_MS);
        }
    }

    const elapsed = Math.round((Date.now() - startMs) / 1000);

    console.log('');
    console.log('─────────────────────────────────────────────');
    console.log(`  ✅ Succeeded : ${succeeded}`);
    if (noResults > 0) console.log(`  ⚠️  No results: ${noResults}`);
    if (failed    > 0) console.log(`  ❌ Failed    : ${failed} (re-run to retry)`);
    console.log(`  ⏱  Elapsed   : ${elapsed}s`);
    console.log('─────────────────────────────────────────────');
    console.log('');
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
