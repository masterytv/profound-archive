# 🗄️ Historical Context, Pipelines, & Resolved Bugs

> **Note:** This file contains architectural history, resolved bugs, and pipeline documentation. It is for human reference and specific deep-dive agent tasks. It is NOT read by default to save context tokens.

## 1. Intake Pipeline Architecture (14 Steps)
1. Parse URL → videoId
2. Check DB (new vs re-process)
3. Scrape metadata & Enrich channel (YT Data API)
4. Fetch + process captions (Supadata)
5. Insert initial record
6. Classify experience (Lightweight AI gate: clear, possible, not_nde)
7. Run 7 parallel analysis passes (Greyson, Trans, Core, Phenom, Flow, cvNDE, Summary)
8. Save results
9. Generate embeddings (search + chat)
10. Sync to Typesense
11. Generate experience fingerprint (pgvector similarity)
12. Mark complete

## 2. YouTube & Video Scraping History
- **Supadata over Apify:** Switched to Supadata (Mar 2026) to bypass YouTube IP blocks. Handles rate limits via HTTP 429 logic.
- **No Long-Polling:** Never use `waitForFinish=N` on serverless. Connections drop. Use async polling (POST run, GET status loop).
- **Caption JSON3:** Always append `&fmt=json3` to YouTube timedtext API to get structured JSON instead of XML.

## 3. Supabase & Database Gotchas
- **1000-Row Limit:** Supabase silently caps results at 1,000 rows. Batch workflows must use RPCs with proper SQL `LEFT JOIN` or `.range()`.
- **pgvector Batches:** Insert large vectors (1536-dim) in batches of 5 to avoid statement timeouts. Always delete-before-insert on re-processing to avoid unique constraint collisions.
- **Nested Selects:** Supabase `table(col, col)` is ambiguous with multiple FKs to the same table. Use explicit JS merges for complex joins.

## 4. Blog & Questions Pipeline (Mar 2026 Upgrades)
- **Auto-Generation:** Unknown question slugs generate answers on the fly via `/api/questions/[slug]/route.ts`.
- **Link Validation:** Pipeline checks academic links (NCBI API + keyword overlap), filters soft-404s, and replaces broken links via Perplexity.
- **Book Links:** Amazon links rot. The pipeline is explicitly prompted: `⛔ Do NOT hyperlink books`.
- **Security:** `OPENROUTER_API_KEY` was leaked via `.next.old` cache commits. Do not run `git add .` blindly.

## 5. Scanner Queue Logic
- **Two Data Sources:** `scan_queue` is transient. `nde_vids.intake_status` is the source of truth for dashboard stats.
- **Two-Phase Cron:** Split Cloudflare timeouts by isolating Channel Discovery (hourly) from Video Processing (every 10m). Direct App Hosting URL bypasses Cloudflare for the heavy AI passes.

## 6. Known Fixed UI Bugs
- **Password Recovery:** Supabase PKCE doesn't forward `type=recovery`. Handled via `user.recovery_sent_at` check in the callback route.
- **Markdown Renderer:** Custom parser now processes links `[text](url)` BEFORE italics `_text_` to prevent URL underscores from breaking into `<em>` tags.