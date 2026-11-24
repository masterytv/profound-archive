#!/usr/bin/env npx tsx
/**
 * READ-ONLY audit: which nde_vids rows have a transcript that isn't English?
 *
 * Background: until 2026-11-20 the Supadata caption call sent no `lang`, so
 * videos with YouTube auto-dub tracks got the FIRST track (often Arabic) and
 * every downstream field was built from it. See src/lib/youtube/caption-language.ts.
 *
 * What it does — SELECTs only, never writes:
 *   1. Pages through nde_vids (videoId, title, channelName, intake_status,
 *      first ~6k chars of subtitles_cleaned) and runs guessLanguage() on each:
 *      script detection (Arabic, Cyrillic, Devanagari, CJK, Hangul, …) plus
 *      stopword scoring for Latin-script languages (es, pt, fr, de, nl, it).
 *   2. Lists rows guessed non-English, grouped by language and by channel.
 *   3. Lists which of those videos have rows in bt_coded_answers (book project).
 *
 * Usage:
 *   npx tsx scripts/report-non-english-transcripts.ts            # summary + list
 *   npx tsx scripts/report-non-english-transcripts.ts --json out.json
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or
 * SUPABASE_SERVICE_ROLE_KEY) in the environment or .env.local. Never prints keys.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { writeFileSync } from 'fs';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { guessLanguage, type LanguageGuess } from '../src/lib/youtube/caption-language';

const PAGE = 200;
const SAMPLE_CHARS = 6000;

interface Flagged {
    videoId: string;
    title: string | null;
    channelName: string | null;
    intake_status: string | null;
    guess: LanguageGuess;
    sample: string;
}

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
        process.exit(1);
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

    const flagged: Flagged[] = [];
    let scanned = 0, empty = 0, unknown = 0;

    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('nde_vids')
            .select('videoId, title, channelName, intake_status, subtitles_cleaned')
            .order('videoId')
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`nde_vids read failed at offset ${from}: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const row of data as any[]) {
            scanned++;
            const text: string = (row.subtitles_cleaned || '').slice(0, SAMPLE_CHARS);
            if (!text.trim()) { empty++; continue; }
            const guess = guessLanguage(text);
            if (guess.lang === 'unknown') { unknown++; continue; }
            if (guess.english) continue;
            flagged.push({
                videoId: row.videoId, title: row.title, channelName: row.channelName,
                intake_status: row.intake_status, guess, sample: text.slice(0, 80).replace(/\s+/g, ' '),
            });
        }
        process.stderr.write(`\rscanned ${scanned}…`);
        if (data.length < PAGE) break;
    }
    process.stderr.write('\n');

    // ── Book project: which flagged videos were coded? ───────────────────────
    // One HEAD count per video: an `.in()` row select is silently capped at
    // 1,000 rows by PostgREST, and coded videos have ~90 rows each.
    const coded = new Set<string>();
    for (const f of flagged) {
        const { count, error } = await supabase
            .from('bt_coded_answers').select('video_id', { count: 'exact', head: true }).eq('video_id', f.videoId);
        if (error) throw new Error(`bt_coded_answers read failed: ${error.message}`);
        if ((count ?? 0) > 0) coded.add(f.videoId);
    }

    // ── Report ───────────────────────────────────────────────────────────────
    const count = <T,>(xs: T[], k: (x: T) => string) =>
        Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[k(x)] = (m[k(x)] ?? 0) + 1), m), {}))
            .sort((a, b) => b[1] - a[1]);

    console.log(`\nScanned ${scanned} nde_vids rows (${empty} with no transcript, ${unknown} too short to judge).`);
    console.log(`Non-English transcripts: ${flagged.length}\n`);

    console.log('By language:');
    for (const [k, n] of count(flagged, f => f.guess.lang)) console.log(`  ${k.padEnd(8)} ${n}`);

    console.log('\nBy channel:');
    for (const [k, n] of count(flagged, f => f.channelName ?? '(none)')) console.log(`  ${String(n).padStart(4)}  ${k}`);

    console.log('\nBy intake_status:');
    for (const [k, n] of count(flagged, f => f.intake_status ?? '(null)')) console.log(`  ${k.padEnd(22)} ${n}`);

    console.log('\nRows (videoId | lang | conf | status | channel | title | sample):');
    for (const f of [...flagged].sort((a, b) => (a.channelName ?? '').localeCompare(b.channelName ?? '') || a.videoId.localeCompare(b.videoId))) {
        console.log(`  ${f.videoId} | ${f.guess.lang} | ${f.guess.confidence.toFixed(2)} | ${f.intake_status} | ${f.channelName} | ${(f.title ?? '').slice(0, 60)} | ${f.sample}`);
    }

    const codedList = [...coded].sort();
    console.log(`\nIn bt_coded_answers (book project, need re-coding): ${codedList.length}`);
    for (const id of codedList) {
        const f = flagged.find(x => x.videoId === id)!;
        console.log(`  ${id}  (${f.guess.lang})`);
    }

    if (jsonOut) {
        writeFileSync(jsonOut, JSON.stringify({ scanned, empty, unknown, flagged, codedInBookTally: codedList }, null, 2));
        console.log(`\nWrote ${jsonOut}`);
    }
}

main().catch(e => { console.error(e?.message || e); process.exit(1); });
