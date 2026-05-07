import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/admin/uap/blog/[id]
 * Toggle publish/unpublish status for a UAP blog post.
 * Verifies the post belongs to domain='uap' before updating.
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body.status as string;
    if (!['published', 'draft'].includes(newStatus)) {
        return NextResponse.json({ error: 'status must be "published" or "draft"' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the post is a UAP domain post
    const { data: post } = await supabase
        .from('blog_posts')
        .select('id, domain')
        .eq('id', postId)
        .single();

    if (!post || post.domain !== 'uap') {
        return NextResponse.json({ error: 'Post not found or not a UAP post' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
    };
    if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', postId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: postId, status: newStatus });
}

/**
 * DELETE /api/admin/uap/blog/[id]
 * Delete a UAP blog post. Verifies domain='uap'.
 */
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the post is a UAP domain post
    const { data: post } = await supabase
        .from('blog_posts')
        .select('id, domain')
        .eq('id', postId)
        .single();

    if (!post || post.domain !== 'uap') {
        return NextResponse.json({ error: 'Post not found or not a UAP post' }, { status: 404 });
    }

    const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
