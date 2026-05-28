#!/usr/bin/env npx tsx
/**
 * Standalone blog generation script — runs directly on Oracle Cloud worker
 * via crontab, replacing the GHA → curl → Firebase App Hosting pipeline.
 *
 * Usage:
 *   npx tsx scripts/blog-generate.ts --domain nde --type question --count 1
 *   npx tsx scripts/blog-generate.ts --domain uap --type question --count 1
 *   npx tsx scripts/blog-generate.ts --domain nde --type story --count 1
 *
 * Environment: Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY, FAL_KEY
 *
 * Oracle Crontab:
 *   0 16 * * * cd ~/profound-archive && npx tsx scripts/blog-generate.ts --domain nde --type question --count 1 >> logs/blog-nde-question.log 2>&1
 *   0 17 * * * cd ~/profound-archive && npx tsx scripts/blog-generate.ts --domain uap --type question --count 1 >> logs/blog-uap-question.log 2>&1
 *   0 18 * * * cd ~/profound-archive && npx tsx scripts/blog-generate.ts --domain nde --type story --count 1 >> logs/blog-nde-story.log 2>&1
 */

import { createClient } from '@supabase/supabase-js';
import { generateBlogArticle } from '../src/lib/pipeline/blog-article';
import { generateUapBlogArticle } from '../src/lib/pipeline/uap-blog-article';
import { generateStoryArticle } from '../src/lib/pipeline/blog-story';

// ── Load .env if not already set ────────────────────────────────────────────
// tsx doesn't load .env by default — require dotenv if available
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
} catch {
    // dotenv not installed — env vars must be set externally
}

// ── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const flags: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--') && args[i + 1]) {
            flags[args[i].replace('--', '')] = args[i + 1];
            i++;
        }
    }

    const domain = flags['domain'] ?? 'nde';
    const type = flags['type'] ?? 'question';
    const count = Math.min(parseInt(flags['count'] ?? '1', 10), 5);

    if (!['nde', 'uap'].includes(domain)) {
        console.error(`❌ Invalid domain: "${domain}" — use "nde" or "uap"`);
        process.exit(1);
    }
    if (!['question', 'story'].includes(type)) {
        console.error(`❌ Invalid type: "${type}" — use "question" or "story"`);
        process.exit(1);
    }
    if (type === 'story' && domain === 'uap') {
        console.error(`❌ UAP story articles are not yet supported`);
        process.exit(1);
    }

    return { domain, type, count };
}

// ── Question article generation ─────────────────────────────────────────────

async function generateQuestions(domain: string, count: number) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const questionsTable = domain === 'uap' ? 'uap_questions' : 'nde_questions';
    const domainFilter = domain === 'uap' ? { column: 'domain', value: 'uap' } : null;

    // Find questions that don't have a blog article yet
    let existingQuery = supabase
        .from('blog_posts')
        .select('source_question_slug')
        .not('source_question_slug', 'is', null);

    if (domainFilter) {
        existingQuery = existingQuery.eq(domainFilter.column, domainFilter.value);
    }

    const { data: generated } = await existingQuery;
    const generatedSlugs = new Set((generated ?? []).map((r) => r.source_question_slug));

    const { data: questions } = await supabase
        .from(questionsTable)
        .select('slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .limit(count + generatedSlugs.size + 10);

    const todo = (questions ?? [])
        .map((q) => q.slug)
        .filter((s) => !generatedSlugs.has(s))
        .slice(0, count);

    if (todo.length === 0) {
        console.log(`✅ All ${domain.toUpperCase()} questions already have blog articles — nothing to do`);
        return;
    }

    console.log(`📝 Generating ${todo.length} ${domain.toUpperCase()} question article(s): ${todo.join(', ')}`);

    const generateFn = domain === 'uap' ? generateUapBlogArticle : generateBlogArticle;

    for (const slug of todo) {
        const start = Date.now();
        try {
            const result = await generateFn(slug);
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(
                `  ✅ ${slug}: ${result.status} (${elapsed}s)` +
                (result.articleSlug ? ` → /blog/${result.articleSlug}` : '') +
                (result.error ? ` — ${result.error}` : '')
            );
        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ❌ ${slug}: FAILED (${elapsed}s) — ${err}`);
        }
    }
}

// ── Story article generation ────────────────────────────────────────────────

async function generateStories(count: number) {
    console.log(`📝 Generating ${count} NDE story article(s)...`);

    for (let i = 0; i < count; i++) {
        const start = Date.now();
        try {
            const result = await generateStoryArticle();
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(
                `  ✅ Story ${i + 1}: ${result.status} (${elapsed}s)` +
                (result.articleSlug ? ` → /blog/${result.articleSlug}` : '') +
                (result.error ? ` — ${result.error}` : '')
            );

            if (result.status === 'no_experiencers') {
                console.log('  ⚠️ No more eligible experiencers — stopping');
                break;
            }
        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ❌ Story ${i + 1}: FAILED (${elapsed}s) — ${err}`);
        }
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const { domain, type, count } = parseArgs();
    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [blog-generate] ${timestamp} | domain=${domain} type=${type} count=${count}`);

    // Validate required env vars
    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        // Try fallback key name
        if (missing.includes('SUPABASE_SERVICE_KEY') && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            // That's fine — the pipeline code checks both
        } else {
            console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
            process.exit(1);
        }
    }

    try {
        if (type === 'question') {
            await generateQuestions(domain, count);
        } else {
            await generateStories(count);
        }
        console.log(`\n✅ [blog-generate] Complete`);
    } catch (err) {
        console.error(`\n❌ [blog-generate] Fatal error:`, err);
        process.exit(1);
    }
}

main();
