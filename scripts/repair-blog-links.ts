#!/usr/bin/env npx tsx
/**
 * One-time repair of malformed links in stored blog_posts bodies (AI-6).
 *
 * Re-runs the (strengthened) sanitizeMarkdownLinks over every blog_posts.body_mdx,
 * and for any row whose rendered output still shows damage, flips it to status
 * 'draft' so it leaves the public surface until reviewed.
 *
 * SAFETY:
 *  - DRY RUN by default. Prints what it WOULD change and writes nothing.
 *  - Pass --apply to perform the writes. Touches ONLY rows whose body actually
 *    changes (or that remain damaged); clean rows are skipped.
 *  - Writes are per-row updates of body_mdx (+ status only when still damaged).
 *
 * Usage:
 *   npx tsx scripts/repair-blog-links.ts            # dry run
 *   npx tsx scripts/repair-blog-links.ts --apply    # perform writes
 */
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { sanitizeMarkdownLinks } from '../src/lib/pipeline/blog-article';
import { findContentDamage } from '../src/lib/pipeline/content-quality';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const APPLY = process.argv.includes('--apply');

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    const supabase = createClient(url, key);

    const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, body_mdx, status');
    if (error) throw error;

    let changed = 0;
    let unchanged = 0;
    let heldAsDraft = 0;
    const drafts: string[] = [];

    for (const post of data!) {
        const original = post.body_mdx || '';
        const repaired = sanitizeMarkdownLinks(original);
        const stillDamaged = findContentDamage(repaired).length > 0;
        const bodyChanged = repaired !== original;

        if (!bodyChanged && !(stillDamaged && post.status === 'published')) {
            unchanged++;
            continue;
        }

        changed++;
        const update: Record<string, unknown> = {};
        if (bodyChanged) update.body_mdx = repaired;
        if (stillDamaged && post.status === 'published') {
            update.status = 'draft';
            heldAsDraft++;
            drafts.push(post.slug);
        }

        if (APPLY) {
            const { error: upErr } = await supabase
                .from('blog_posts')
                .update(update)
                .eq('id', post.id);
            if (upErr) {
                console.error(`  ✗ ${post.slug}: ${upErr.message}`);
            } else {
                console.log(`  ✓ ${post.slug}${update.status ? ' (→ draft)' : ''}`);
            }
        } else {
            console.log(`  WOULD UPDATE ${post.slug}${update.status ? ' (→ draft)' : ' (body only)'}`);
        }
    }

    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — total ${data!.length} | to change ${changed} | unchanged ${unchanged} | held as draft ${heldAsDraft}`);
    if (drafts.length) {
        console.log('held-as-draft slugs (need manual review):');
        drafts.forEach((s) => console.log('  -', s));
    }
    if (!APPLY) console.log('\nNo writes performed. Re-run with --apply to commit.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
