#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# fix-multi-encounters.sh
#
# Fixes videos where the encounter segmenter over-split a single experiencer's
# life story into multiple encounter rows. For each affected video:
#   1. Deletes all but one encounter row (keeps encounter_index=0)
#   2. Calls /api/uap/reanalyze to re-run full analysis on the single encounter
#   3. Updates uap_vids with corrected encounter_count and multi_encounter flags
#
# Usage:
#   chmod +x scripts/fix-multi-encounters.sh
#   ./scripts/fix-multi-encounters.sh [--dry-run]
#
# Requirements:
#   - Next.js dev server running on port 3000
#   - .env.local with CRON_SECRET set
#   - curl and jq installed
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000}"
CRON_SECRET=$(grep '^CRON_SECRET=' .env.local 2>/dev/null | cut -d'=' -f2)
DRY_RUN=false
DELAY_BETWEEN=5  # seconds between API calls to not overwhelm OpenAI

if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE — no changes will be made"
fi

if [[ -z "$CRON_SECRET" ]]; then
    echo "❌ CRON_SECRET not found in .env.local"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  UAP Multi-Encounter Fix Script"
echo "  Fixes over-split single-experiencer encounter analysis"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Call the consolidation API ───────────────────────────────────────
echo "📊 Step 1: Consolidating encounter rows..."
echo ""

CONSOLIDATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/uap/fix-encounters" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{\"dryRun\": ${DRY_RUN}}")

echo "$CONSOLIDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CONSOLIDATE_RESPONSE"

VIDEOS_TO_FIX=$(echo "$CONSOLIDATE_RESPONSE" | jq -r '.videoIds[]' 2>/dev/null || echo "")
FIX_COUNT=$(echo "$CONSOLIDATE_RESPONSE" | jq -r '.fixedCount // 0' 2>/dev/null || echo "0")

echo ""
echo "📋 Found ${FIX_COUNT} videos to reanalyze"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 Dry run complete. Run without --dry-run to apply changes."
    exit 0
fi

if [[ -z "$VIDEOS_TO_FIX" || "$FIX_COUNT" == "0" ]]; then
    echo "✅ No videos need fixing!"
    exit 0
fi

# ─── Step 2: Reanalyze each video ────────────────────────────────────────────
echo "🔬 Step 2: Re-running encounter analysis for each video..."
echo ""

SUCCESS=0
FAILED=0
TOTAL=0

for VIDEO_ID in $VIDEOS_TO_FIX; do
    TOTAL=$((TOTAL + 1))
    echo "  [${TOTAL}/${FIX_COUNT}] Reanalyzing ${VIDEO_ID}..."

    RESULT=$(curl -s -X POST "${BASE_URL}/api/uap/reanalyze" \
        -H "Authorization: Bearer ${CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d "{\"videoId\": \"${VIDEO_ID}\", \"mode\": \"full\"}")

    STATUS=$(echo "$RESULT" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    TITLE=$(echo "$RESULT" | jq -r '.title // "?"' 2>/dev/null || echo "?")
    DURATION=$(echo "$RESULT" | jq -r '.duration_ms // "?"' 2>/dev/null || echo "?")

    if [[ "$STATUS" == "success" ]]; then
        SUCCESS=$((SUCCESS + 1))
        echo "    ✅ \"${TITLE}\" (${DURATION}ms)"
    else
        FAILED=$((FAILED + 1))
        ERROR=$(echo "$RESULT" | jq -r '.error // "unknown error"' 2>/dev/null || echo "unknown error")
        echo "    ❌ \"${TITLE}\" — ${ERROR}"
    fi

    # Rate limiting delay
    if [[ $TOTAL -lt $FIX_COUNT ]]; then
        sleep $DELAY_BETWEEN
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Results: ${SUCCESS} ✅ success / ${FAILED} ❌ failed / ${TOTAL} total"
echo "═══════════════════════════════════════════════════════════════"
