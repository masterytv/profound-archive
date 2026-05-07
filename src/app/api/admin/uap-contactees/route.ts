/**
 * UAP Contactee Profiles Admin API
 *
 * GET: Returns paginated list of contactees with search
 * POST: Handles create, update, and delete actions
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

// Slugify: lowercase, trim, replace spaces/special chars with hyphens
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric
    .replace(/[\s_]+/g, '-')          // spaces/underscores to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens
}

// ─── GET: Paginated contactee list ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') || '0', 10);
  const limit = Math.min(parseInt(params.get('limit') || '25', 10), 100);
  const search = params.get('search');

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('uap_contactee_profiles')
    .select(
      'id, slug, display_name, is_anonymous, summary, bio, photo_url, video_ids, experience_type, entity_types, recurrence, core_themes, avg_evidence_score, avg_contact_depth, avg_transformation_score, highlight_quote, first_shared_year, total_views, contribution_label, created_at, updated_at',
      { count: 'exact' },
    )
    .order('display_name', { ascending: true });

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: contactees, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contactees: contactees || [],
    totalCount: count || 0,
    page,
    limit,
  });
}

// ─── POST: Create, Update, Delete ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;
  const supabase = getSupabaseAdmin();

  // ── CREATE ──────────────────────────────────────────────────────────────
  if (action === 'create') {
    const { display_name, bio, summary, experience_type, video_ids, entity_types, core_themes, slug: customSlug } = body;

    if (!display_name?.trim()) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }

    const slug = customSlug?.trim() || slugify(display_name);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('uap_contactee_profiles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" already exists` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('uap_contactee_profiles')
      .insert({
        display_name: display_name.trim(),
        slug,
        bio: bio?.trim() || null,
        summary: summary?.trim() || null,
        experience_type: experience_type?.trim() || null,
        video_ids: video_ids || [],
        entity_types: entity_types || [],
        core_themes: core_themes || [],
        is_anonymous: false,
      })
      .select('id, slug, display_name')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[UAP Contactees] Created: ${data.display_name} (${data.slug})`);
    return NextResponse.json({ success: true, contactee: data });
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────
  if (action === 'update') {
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required for update' }, { status: 400 });
    }

    // Build update payload from allowed fields only
    const allowedFields = [
      'display_name', 'slug', 'bio', 'summary', 'is_anonymous', 'photo_url',
      'video_ids', 'experience_type', 'entity_types', 'recurrence',
      'core_themes', 'highlight_quote', 'highlight_quote_source',
      'first_shared_year', 'contribution_label',
    ];

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in fields && fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    }

    // If slug is being changed, check uniqueness
    if (updateData.slug) {
      const { data: existing } = await supabase
        .from('uap_contactee_profiles')
        .select('id')
        .eq('slug', updateData.slug as string)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: `Slug "${updateData.slug}" already exists` }, { status: 409 });
      }
    }

    const { error } = await supabase
      .from('uap_contactee_profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[UAP Contactees] Updated: ${id}`);
    return NextResponse.json({ success: true, id });
  }

  // ── DELETE ──────────────────────────────────────────────────────────────
  if (action === 'delete') {
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required for delete' }, { status: 400 });
    }

    const { error } = await supabase
      .from('uap_contactee_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[UAP Contactees] Deleted: ${id}`);
    return NextResponse.json({ success: true, id });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
