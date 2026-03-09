import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return NextResponse.json({ results: [] });

    const { data, error } = await supabase.rpc('search_nde_questions', {
        q,
        match_count: 6,
    });

    if (error) {
        console.error('[questions/search]', error.message);
        return NextResponse.json({ results: [] });
    }

    return NextResponse.json({ results: data ?? [] });
}
