#!/usr/bin/env bash
#
# Oracle automation-host deploy script.
#
# The Oracle VM runs Project Profound's scheduled automation (crontab scanners +
# the pm2 `profound-worker` batch processor). It does NOT auto-pull from GitHub —
# run this script by hand to bring it current with `main`:
#
#     cd ~/profound-archive && ./scripts/deploy-oracle.sh
#
# What it does (and why):
#   1. Fetches + fast-forwards to origin/main. --ff-only fails loudly if the
#      checkout has diverged (local commits), rather than creating a merge.
#   2. Runs `npm ci` ONLY if package.json / package-lock.json changed — deps
#      rarely move, and `npm ci` is the slow part.
#   3. Restarts the pm2 worker with --update-env. THIS IS THE CRITICAL STEP:
#      `rapid-process.ts` calls dotenv.config() once at startup and never re-reads
#      the file, so without a restart the long-lived worker keeps running stale
#      code AND a stale .env.local in memory. (See docs/LEARNINGS.md §5.)
#
# The crontab scanners (scanner-process.ts, scanner-discover.ts, blog-generate.ts)
# need no restart — each tick is a fresh `npx tsx` process that re-reads source
# and env on every run, so the git pull alone updates them.
#
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root, regardless of where it's invoked from
BRANCH="${DEPLOY_BRANCH:-main}"

echo "▶ Fetching origin/$BRANCH ..."
git fetch origin "$BRANCH"

BEFORE="$(git rev-parse HEAD)"

# Detect dependency changes BEFORE we move HEAD.
DEPS_CHANGED=0
if ! git diff --quiet "HEAD..origin/$BRANCH" -- package.json package-lock.json; then
  DEPS_CHANGED=1
fi

echo "▶ Pulling (fast-forward only) ..."
git pull --ff-only origin "$BRANCH"
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "✓ Already up to date ($AFTER). Nothing to deploy."
  exit 0
fi

if [ "$DEPS_CHANGED" -eq 1 ]; then
  echo "▶ Dependencies changed — running npm ci ..."
  npm ci
else
  echo "✓ No dependency changes — skipping npm ci."
fi

echo "▶ Restarting pm2 worker (reloads code + .env.local) ..."
pm2 restart profound-worker --update-env

echo ""
echo "✓ Deploy complete: ${BEFORE:0:9} → ${AFTER:0:9}"
echo "  Newly deployed commits:"
git log --oneline "$BEFORE..$AFTER" | sed 's/^/    /'
