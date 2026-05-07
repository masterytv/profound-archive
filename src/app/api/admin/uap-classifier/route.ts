/**
 * UAP Classifier Admin API
 *
 * GET: Returns paginated list of classified videos with filters
 * POST: Handles classification overrides
 *
 * Auth: isAdminUser() guard (LEARNINGS.md requirement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ─── GET: Paginated video list with filters ──────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') || '0', 10);
  const limit = Math.min(parseInt(params.get('limit') || '25', 10), 100);
  const tier = params.get('tier');
  const track = params.get('track');
  const intakeStatus = params.get('intake_status');
  const search = params.get('search');

  const supabase = getSupabaseAdmin();

  // Build query
  let query = supabase
    .from('uap_vids')
    .select(
      'video_id, title, tier, track, content_type, intake_status, classified_at, classifier_model',
      { count: 'exact' },
    )
    .not('classified_at', 'is', null)
    .order('classified_at', { ascending: false });

  // Apply filters
  if (tier) query = query.eq('tier', parseInt(tier, 10));
  if (track) query = query.eq('track', track);
  if (intakeStatus) query = query.eq('intake_status', intakeStatus);
  if (search) {
    // Search by title or video_id
    query = query.or(`title.ilike.%${search}%,video_id.ilike.%${search}%`);
  }

  // Paginate
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: videos, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    videos: videos || [],
    totalCount: count || 0,
    page,
    limit,
  });
}

// ─── POST: Classification overrides ──────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action !== 'override') {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  }

  const { video_id, tier, track } = body;

  if (!video_id || !tier || !track) {
    return NextResponse.json(
      { error: 'Missing required fields: video_id, tier, track' },
      { status: 400 },
    );
  }

  // Validate tier
  if (![1, 2, 3].includes(tier)) {
    return NextResponse.json(
      { error: 'Invalid tier: must be 1, 2, or 3' },
      { status: 400 },
    );
  }

  // Validate track
  if (!['encounter', 'program'].includes(track)) {
    return NextResponse.json(
      { error: 'Invalid track: must be encounter or program' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Build update — if changing to Tier 3, also set intake_status
  const updateData: Record<string, unknown> = {
    tier,
    track,
    classified_at: new Date().toISOString(),
    classifier_model: 'admin_override',
  };

  if (tier === 3) {
    updateData.intake_status = 'out_of_scope';
  }

  const { error } = await supabase
    .from('uap_vids')
    .update(updateData)
    .eq('video_id', video_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(
    `[UAP Classifier] Admin override: ${video_id} → Tier ${tier}, Track ${track}`,
  );

  return NextResponse.json({ success: true, video_id, tier, track });
}
