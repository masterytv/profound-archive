/**
 * POST /api/admin/experiencer/generate
 * 
 * Admin-only route to generate/refresh experiencer profile celebration data.
 * Accepts either { profileId } for a single profile or { all: true } for batch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { 
  generateExperiencerProfile, 
  refreshAllExperiencerProfiles,
  createExperiencerPipelineClient 
} from '@/lib/pipeline/experiencer-profile';

export async function POST(request: NextRequest) {
  // Auth check
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createExperiencerPipelineClient();

    if (body.all) {
      // Batch refresh all profiles
      const results = await refreshAllExperiencerProfiles(supabase);
      const successCount = results.filter(r => r.status === 'success').length;
      return NextResponse.json({
        success: true,
        total: results.length,
        enriched: successCount,
        results,
      });
    }

    if (body.profileId) {
      // Single profile refresh
      const result = await generateExperiencerProfile(supabase, body.profileId);
      return NextResponse.json({ success: result.status === 'success', ...result });
    }

    return NextResponse.json({ error: 'Provide profileId or { all: true }' }, { status: 400 });
  } catch (error: any) {
    console.error('[ExperiencerGenerate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
