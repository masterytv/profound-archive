import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { generateBlogArticle, generateGuideArticle, type ArticleStep } from '@/lib/pipeline/blog-article';
import { generateStoryArticle, type StoryStep } from '@/lib/pipeline/blog-story';

export const maxDuration = 600; // 10-min timeout — guide drafts with Claude can take 2-3 min

/**
 * POST /api/admin/blog/generate
 * Triggers the blog article pipeline for a question, guide, or story.
 * Auth-gated. Returns Server-Sent Events stream for real-time step progress.
 *
 * Body:
 *   { questionSlug: string }                                  — generate a big-question article
 *   { type: "guide", pillarTitle, targetQuery, authorName }   — generate a pillar guide
 *   { type: "story", experiencerSlug?: string }               — generate an experiencer story
 */
export async function POST(req: Request) {
    // Auth check — admin or super_admin only
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // ── Story generation ──
    if (body.type === 'story') {
        const experiencerSlug = body.experiencerSlug as string | undefined;

        return streamResponse(async (send) => {
            const result = await generateStoryArticle(
                experiencerSlug || undefined,
                (step: StoryStep) => { send({ type: 'step', step }); }
            );
            send({ type: 'complete', result });
        });
    }

    // ── Guide (pillar page) generation ──
    if (body.type === 'guide') {
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

    // ── Default: question-based article ──
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

// Shared SSE stream helper with keepalive to prevent Cloudflare proxy timeouts
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

            // Send keepalive pings every 15s to prevent Cloudflare from
            // cutting the connection during long-running Claude calls.
            // SSE comments (lines starting with :) are silently ignored
            // by the browser but reset the proxy idle timer.
            const keepalive = setInterval(() => {
                try {
                    controller.enqueue(
                        new TextEncoder().encode(`: keepalive\n\n`)
                    );
                } catch {
                    // Stream already closed — clear interval
                    clearInterval(keepalive);
                }
            }, 15_000);

            try {
                await run(send);
            } catch (err) {
                send({ type: 'error', error: String(err) });
            } finally {
                clearInterval(keepalive);
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
