import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { generateBlogArticle, generateGuideArticle, type ArticleStep } from '@/lib/pipeline/blog-article';

export const maxDuration = 300; // 5-min timeout — pipeline can be slow

/**
 * POST /api/admin/blog/generate
 * Triggers the blog article pipeline for a question slug or a guide pillar.
 * Auth-gated. Returns Server-Sent Events stream for real-time step progress.
 *
 * Body:
 *   { questionSlug: string }                          — generate a big-question article
 *   { type: "guide", pillarTitle, targetQuery, authorName } — generate a pillar guide
 */
export async function POST(req: Request) {
    // Auth check — admin or super_admin only
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Determine generation type
    const isGuide = body.type === 'guide';

    if (isGuide) {
        const pillarTitle = body.pillarTitle as string | undefined;
        const targetQuery = body.targetQuery as string | undefined;
        const authorName = body.authorName as string || 'Tom Wood';

        if (!pillarTitle || !targetQuery) {
            return NextResponse.json({ error: 'pillarTitle and targetQuery are required for guide generation' }, { status: 400 });
        }

        return streamResponse(async (send) => {
            const result = await generateGuideArticle(pillarTitle, targetQuery, authorName, (step: ArticleStep) => {
                send({ type: 'step', step });
            });
            send({ type: 'complete', result });
        });
    }

    // Default: question-based article
    const questionSlug = body.questionSlug as string | undefined;

    if (!questionSlug) {
        return NextResponse.json({ error: 'questionSlug is required' }, { status: 400 });
    }

    return streamResponse(async (send) => {
        const result = await generateBlogArticle(questionSlug, (step: ArticleStep) => {
            send({ type: 'step', step });
        });
        send({ type: 'complete', result });
    });
}

// Shared SSE stream helper
function streamResponse(
    run: (send: (data: Record<string, unknown>) => void) => Promise<void>
): Response {
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
                );
            };

            try {
                await run(send);
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
