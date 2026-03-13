import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const supabase = await createClient();

    // Auth check — must be logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    };

    // Set published_at when publishing for the first time
    if (status === "published") {
        // Only set published_at if it isn't already set
        const { data: existing } = await supabase
            .from("blog_posts")
            .select("published_at")
            .eq("id", postId)
            .single();

        if (!existing?.published_at) {
            updatePayload.published_at = new Date().toISOString();
        }
    }

    const { data, error } = await supabase
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
