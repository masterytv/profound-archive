#!/usr/bin/env bash
# DEPRECATED: Use rapid-process.ts instead.
# This curl-based approach was replaced by a local pipeline runner
# that matches the uap-playlist-intake-batch.ts pattern.
echo "Use: npx tsx scripts/rapid-process.ts"
echo "  DOMAIN=nde npx tsx scripts/rapid-process.ts   # NDE only"
echo "  DOMAIN=both npx tsx scripts/rapid-process.ts  # Both"
