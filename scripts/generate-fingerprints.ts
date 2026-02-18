/**
 * Generate Experience Fingerprints (CLI)
 *
 * Batch generates 27-dimension experience fingerprint vectors for all videos
 * that have NDERF analysis data but no fingerprint yet.
 *
 * Usage:
 *   npx tsx scripts/generate-fingerprints.ts           # batch of 100
 *   npx tsx scripts/generate-fingerprints.ts --all      # loop until done
 *   npx tsx scripts/generate-fingerprints.ts --limit 50 # custom batch size
 */

import { createClient } from "@supabase/supabase-js";
import { buildFingerprint } from "../src/lib/ai/fingerprint";
import "dotenv/config";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function processBatch(limit: number): Promise<number> {
    const { data: rows, error } = await supabase
        .from("nde_analysis")
        .select("video_id, core_elements, intensity_rating, overall_tone, experience_type, trigger_category")
        .not("core_elements", "is", null)
        .is("experience_fingerprint", null)
        .limit(limit);

    if (error) {
        console.error("❌ Query error:", error.message);
        return 0;
    }

    if (!rows || rows.length === 0) {
        console.log("✅ No more videos to process — all fingerprints generated!");
        return 0;
    }

    console.log(`🔄 Processing ${rows.length} videos...`);
    let success = 0;
    let skipped = 0;

    for (const row of rows) {
        const fingerprint = buildFingerprint(row);
        if (!fingerprint) {
            skipped++;
            continue;
        }

        const vectorStr = `[${fingerprint.join(",")}]`;

        const { error: updateError } = await supabase
            .from("nde_analysis")
            .update({ experience_fingerprint: vectorStr })
            .eq("video_id", row.video_id);

        if (updateError) {
            console.error(`  ❌ ${row.video_id}: ${updateError.message}`);
        } else {
            success++;
        }
    }

    console.log(`  ✅ ${success} fingerprints generated, ${skipped} skipped (missing data)`);
    return success;
}

async function main() {
    const args = process.argv.slice(2);
    const isAll = args.includes("--all");
    const limitIdx = args.indexOf("--limit");
    const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;

    console.log("🧬 Experience Fingerprint Generator");
    console.log(`   Mode: ${isAll ? "ALL (loop)" : `batch of ${limit}`}`);

    if (isAll) {
        let totalProcessed = 0;
        let batchNum = 0;
        while (true) {
            batchNum++;
            console.log(`\n--- Batch ${batchNum} ---`);
            const count = await processBatch(100);
            totalProcessed += count;
            if (count === 0) break;
        }
        console.log(`\n🏁 Done! Total fingerprints generated: ${totalProcessed}`);
    } else {
        await processBatch(limit);
    }
}

main().catch(console.error);
