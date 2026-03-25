import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminUser } from '@/lib/auth/admin-guard';

// Service client that bypasses RLS — same pattern as admin/blog/page.tsx
function getAdminClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Auth check helper — verifies the caller is an admin or super_admin
async function requireAdmin(): Promise<NextResponse | null> {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

// PATCH /api/admin/blog/[id] — toggle publish status
// Also handles form-encoded POST with _method=PATCH from the admin table
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const authResult = await requireAdmin();
    if (authResult) return authResult;

    // Parse status from JSON or form body
    let status: string | undefined;
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        const body = await req.json();
        status = body.status;
    } else {
        // form-encoded (from the HTML form in admin/blog/page.tsx)
        const formData = await req.formData();
        status = formData.get("status") as string | undefined;
    }

    if (!status || !["published", "draft"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    };

    // Set published_at when publishing for the first time
    if (status === "published") {
        const { data: existing } = await adminClient
            .from("blog_posts")
            .select("published_at")
            .eq("id", postId)
            .single();

        if (!existing?.published_at) {
            updatePayload.published_at = new Date().toISOString();
        }
    }

    const { data, error } = await adminClient
        .from("blog_posts")
        .update(updatePayload)
        .eq("id", postId)
        .select("id, slug, status, published_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Redirect back to admin blog page if this was a form POST
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        return new Response(null, {
            status: 303,
            headers: { Location: "/admin/blog" },
        });
    }

    return NextResponse.json({ success: true, post: data });
}

// Allow form POST → redirect pattern
export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    return PATCH(req, context);
}

// GET /api/admin/blog/[id] — fetch full post for editing
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const authResult = await requireAdmin();
    if (authResult) return authResult;

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
        .from("blog_posts")
        .select("id, slug, title, subtitle, lead_paragraph, body_mdx, seo_title, seo_description, status, word_count, category, author_name, hero_image_url")
        .eq("id", postId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
    }

    return NextResponse.json({ post: data });
}

// PUT /api/admin/blog/[id] — save edits to post fields
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const authResult = await requireAdmin();
    if (authResult) return authResult;

    const body = await req.json();

    // Only allow these fields to be edited
    const allowed = ["title", "subtitle", "lead_paragraph", "body_mdx", "seo_title", "seo_description"];
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const key of allowed) {
        if (key in body) {
            updatePayload[key] = body[key];
        }
    }

    // Recalculate word count if body changed
    if (body.body_mdx) {
        updatePayload.word_count = body.body_mdx.split(/\s+/).filter(Boolean).length;
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
        .from("blog_posts")
        .update(updatePayload)
        .eq("id", postId)
        .select("id, slug, title, status, word_count, updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
}

// DELETE /api/admin/blog/[id] — permanently remove a post so it can be re-generated
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const authResult = await requireAdmin();
    if (authResult) return authResult;

    const adminClient = getAdminClient();

    // Fetch the post first so we can return info about what was deleted
    const { data: existing, error: fetchError } = await adminClient
        .from("blog_posts")
        .select("id, slug, title, category")
        .eq("id", postId)
        .single();

    if (fetchError || !existing) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete related images first (if the table exists)
    await adminClient
        .from("blog_post_images")
        .delete()
        .eq("blog_post_id", postId);

    // Hard delete the post — this lets the pipeline re-process the question/topic
    const { error: deleteError } = await adminClient
        .from("blog_posts")
        .delete()
        .eq("id", postId);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        deleted: {
            id: existing.id,
            slug: existing.slug,
            title: existing.title,
            category: existing.category,
        },
    });
}
