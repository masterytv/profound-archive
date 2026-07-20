// Firebase App Hosting workaround: @apphosting/adapter-nextjs (<= 14.0.21)
// skips copying public/ into the deploy bundle whenever Next's file tracing
// has already created a partial .next/standalone/public — which happens as
// soon as any server code reads a file from public/ at runtime (our OG-image
// routes read public/logo-new-light.png). The deployed app then serves ONLY
// the traced files and 404s every other public/ asset.
// npm runs this "postbuild" hook after `next build` and before the adapter's
// copy step, so merging the full public/ here makes every asset ship.
// Upstream: https://github.com/firebase/apphosting-adapters/issues/630
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";
if (existsSync(standalone)) {
  cpSync("public", `${standalone}/public`, { recursive: true, force: true });
  console.log("[postbuild] Merged public/ into .next/standalone/public");
} else {
  // Plain local `next build` (no NEXT_PRIVATE_STANDALONE) has no standalone dir.
  console.log("[postbuild] No .next/standalone — skipping public/ copy");
}
