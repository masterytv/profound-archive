import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBlogArticle, type ArticleStep } from '@/lib/pipeline/blog-article';

export const maxDuration = 300; // 5-min Vercel timeout — pipeline can be slow

/**
 * POST /api/admin/blog/generate
 * Triggers the blog article pipeline for one nde_questions slug.
 * Auth-gated — must be logged in.
 * Returns Server-Sent Events stream for real-time step progress.
 */
export async function POST(req: Request) {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const questionSlug = body.questionSlug as string | undefined;

    if (!questionSlug) {
        return NextResponse.json({ error: 'questionSlug is required' }, { status: 400 });
    }

    // Stream progress via Server-Sent Events
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
                );
            };

            try {
                const result = await generateBlogArticle(questionSlug, (step: ArticleStep) => {
                    send({ type: 'step', step });
                });

                send({ type: 'complete', result });
            } catch (err) {
                send({ type: 'error', error: String(err) });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
