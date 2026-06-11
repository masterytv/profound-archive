import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { getBudgetStatus } from '@/lib/ai/budget';
import { generateUapBlogArticle, type ArticleStep } from '@/lib/pipeline/uap-blog-article';

export const maxDuration = 600; // 10-min timeout

/**
 * POST /api/admin/uap/blog/generate
 * Triggers the UAP blog article pipeline for a uap_questions slug.
 * Auth-gated. Returns Server-Sent Events stream for real-time step progress.
 *
 * Body: { questionSlug: string }
 */
export async function POST(req: Request) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const budget = await getBudgetStatus();
    if (!budget.allowed) {
        return NextResponse.json({ error: `AI budget reached — ${budget.reason}. Raise the cap in env (AI_BUDGET_*) or wait for the window to reset.` }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const questionSlug = body.questionSlug as string | undefined;

    if (!questionSlug) {
        return NextResponse.json({ error: 'questionSlug is required' }, { status: 400 });
    }

    return streamResponse(async (send) => {
        const result = await generateUapBlogArticle(questionSlug, (step: ArticleStep) => {
            send({ type: 'step', step });
        });
        send({ type: 'complete', result });
    });
}

// SSE stream helper with keepalive
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

            const keepalive = setInterval(() => {
                try {
                    controller.enqueue(
                        new TextEncoder().encode(`: keepalive\n\n`)
                    );
                } catch {
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
