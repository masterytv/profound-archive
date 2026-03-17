import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

export const maxDuration = 30;

/**
 * DELETE /api/admin/blog/reset-81q
 * 
 * Deletes all big-question blog posts so they can be regenerated
 * with the upgraded pipeline. Admin-only.
 */
export async function DELETE(req: Request) {
    const adminCheck = await isAdminUser(req);
    if (!adminCheck.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // List what we're about to delete
    const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, slug, title, source_question_slug')
        .eq('category', 'big-question');

    if (!existing || existing.length === 0) {
        return NextResponse.json({ message: 'No big-question articles found', deleted: 0 });
    }

    // Delete them
    const ids = existing.map(a => a.id);
    const { error } = await supabase
        .from('blog_posts')
        .delete()
        .in('id', ids);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        message: `Deleted ${existing.length} big-question articles`,
        deleted: existing.length,
        deletedSlugs: existing.map(a => a.slug),
    });
}
