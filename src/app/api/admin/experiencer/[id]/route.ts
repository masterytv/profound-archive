/**
 * PUT /api/admin/experiencer/[id]
 * 
 * Admin-only route to update experiencer profile fields.
 * Supports updating: photo_url, bio, social_links, offerings,
 * contribution_label, published_at, and any other admin-editable field.
 * 
 * To hide/unpublish a profile: PUT { "published_at": null }
 * To re-publish: PUT { "published_at": "<iso-date>" }
 * 
 * DELETE /api/admin/experiencer/[id]
 * Permanently removes an experiencer profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
  return createClient(url, key);
}

// Allowed fields that admins can edit
const EDITABLE_FIELDS = [
  'photo_url',
  'bio',
  'social_links',
  'offerings',
  'contribution_label',
  'highlight_quote',
  'highlight_quote_source',
  'summary',
  'thank_you_note',
  'full_name',
  'published_at',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // Filter to only editable fields
    const update: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    update.updated_at = new Date().toISOString();

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('experiencer_profiles')
      .update(update)
      .eq('id', profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: Object.keys(update) });
  } catch (error: any) {
    console.error('[ExperiencerUpdate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('experiencer_profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: profileId });
  } catch (error: any) {
    console.error('[ExperiencerDelete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

