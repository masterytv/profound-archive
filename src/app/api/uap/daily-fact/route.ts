import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/uap/daily-fact
 * 
 * Returns the daily fact for today (or a specified date).
 * Query params:
 *   - date: ISO date string (optional, defaults to today)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  const targetDate = dateParam || new Date().toISOString().split('T')[0];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try exact date first
  let { data, error } = await supabase
    .from('uap_daily_facts')
    .select('*')
    .eq('fact_date', targetDate)
    .single();

  // If no fact for today, get the most recent one
  if (!data || error) {
    const { data: recent, error: recentError } = await supabase
      .from('uap_daily_facts')
      .select('*')
      .lte('fact_date', targetDate)
      .order('fact_date', { ascending: false })
      .limit(1)
      .single();

    if (recentError || !recent) {
      return NextResponse.json(
        { error: 'No facts available yet' },
        { status: 404 }
      );
    }
    data = recent;
  }

  return NextResponse.json({
    fact_date: data.fact_date,
    fact_text: data.fact_text,
    fact_category: data.fact_category,
    fact_emoji: data.fact_emoji,
    sample_size: data.sample_size,
    supporting_data: data.supporting_data,
    related_video_ids: data.related_video_ids,
  }, {
    headers: {
      // Cache for 1 hour on CDN, revalidate
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
