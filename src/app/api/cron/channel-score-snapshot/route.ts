import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

/**
 * Monthly cron: snapshots current channel scores into history table.
 * Called by GHA on the 1st of each month, or manually to seed the first baseline.
 *
 * Auth: CRON_SECRET bearer token
 */
export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Compute current month's first day (UTC)
  const now = new Date();
  const snapshotMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  // Read all current channel scores
  const { data: scores, error: fetchError } = await supabase
    .from("uap_channel_scores")
    .select(
      "channel_id, intelligence_value, credibility_score, encounter_depth, impact_score, authority_score, letter_grade",
    );

  if (fetchError) {
    console.error("[channel-score-snapshot] Fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!scores || scores.length === 0) {
    return NextResponse.json({ message: "No channel scores to snapshot", count: 0 });
  }

  // Upsert into history table (ON CONFLICT update)
  const rows = scores.map((s) => ({
    channel_id: s.channel_id,
    snapshot_month: snapshotMonth,
    intelligence_value: s.intelligence_value,
    credibility_score: s.credibility_score,
    encounter_depth: s.encounter_depth,
    impact_score: s.impact_score,
    authority_score: s.authority_score,
    letter_grade: s.letter_grade,
  }));

  const { error: upsertError } = await supabase
    .from("uap_channel_score_history")
    .upsert(rows, { onConflict: "channel_id,snapshot_month" });

  if (upsertError) {
    console.error("[channel-score-snapshot] Upsert error:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  console.log(`[channel-score-snapshot] Snapshotted ${rows.length} channels for ${snapshotMonth}`);

  return NextResponse.json({
    message: `Snapshotted ${rows.length} channels for ${snapshotMonth}`,
    count: rows.length,
    snapshot_month: snapshotMonth,
  });
}
