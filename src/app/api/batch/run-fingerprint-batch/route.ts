import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildFingerprint } from "@/lib/ai/fingerprint";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * POST /api/batch/run-fingerprint-batch
 * Generates experience fingerprints for videos that have NDERF analysis but no fingerprint.
 * Protected by CRON_SECRET.
 */
export async function POST(req: Request) {
    // Auth check — CRON_SECRET only, header-only (S-5; no debug bypass)
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const limit = body.limit || 100;

        // Get videos with analysis data but no fingerprint
        const { data: rows, error: queryError } = await supabase
            .from("nde_analysis")
            .select("video_id, core_elements, intensity_rating, overall_tone, experience_type, trigger_category")
            .not("core_elements", "is", null)
            .is("experience_fingerprint", null)
            .limit(limit);

        if (queryError) {
            return NextResponse.json({ error: queryError.message }, { status: 500 });
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json({
                message: "No videos need fingerprints",
                processed: 0,
                remaining: 0,
            });
        }

        let success = 0;
        let errors: string[] = [];

        for (const row of rows) {
            const fingerprint = buildFingerprint(row);
            if (!fingerprint) continue;

            const vectorStr = `[${fingerprint.join(",")}]`;

            const { error: updateError } = await supabase
                .from("nde_analysis")
                .update({ experience_fingerprint: vectorStr })
                .eq("video_id", row.video_id);

            if (updateError) {
                errors.push(`${row.video_id}: ${updateError.message}`);
            } else {
                success++;
            }
        }

        // Check remaining
        const { count } = await supabase
            .from("nde_analysis")
            .select("video_id", { count: "exact", head: true })
            .not("core_elements", "is", null)
            .is("experience_fingerprint", null);

        return NextResponse.json({
            message: `Generated ${success} fingerprints`,
            processed: success,
            remaining: count || 0,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err: any) {
        console.error("Fingerprint batch error:", err);
        return NextResponse.json(
            { error: err.message || "Internal error" },
            { status: 500 }
        );
    }
}
