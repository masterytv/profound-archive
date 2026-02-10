# Search / Vector Search Logic

**Status:** ✅ Native Logic
**File:** N/A (Likely part of a larger workflow or one of the vector/search JSONs)

## Description
Handles the complex logic of "semantic search" vs "keyword search" vs "filter search".

## Current Implementation
The Next.js app proxies requests to `https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c`.

## Migration Plan
1. Identify which exact n8n workflow corresponds to this webhook.
2. Rebuild the logic in `src/app/api/search/route.ts` using Supabase RPC functions:
   - `search_nde_moments`
   - `match_nde_moments_semantic`
3. Remove the proxy call.
