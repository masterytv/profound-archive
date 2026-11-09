import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isShareEnabled } from '@/lib/share/config';
import { getIntroByToken } from '@/lib/share/channels';
import IntroResponse from '@/components/share/IntroResponse';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Introduction request | Project Profound', robots: { index: false } };

/**
 * Linked from the introduction email. Shows the request and asks for an
 * explicit click: a GET never accepts or declines (link scanners prefetch).
 */
export default async function IntroPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ choice?: string }> }) {
    if (!isShareEnabled()) notFound();
    const { token } = await params;
    const { choice } = await searchParams;
    const intro = await getIntroByToken(token);

    return (
        <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
            <h1 className="text-3xl font-serif">An introduction request</h1>
            {!intro ? (
                <p>This link isn&apos;t valid. If you think that&apos;s a mistake, email hello@projectprofound.org.</p>
            ) : intro.status !== 'pending' ? (
                <p>You already answered this request ({intro.status}). Thank you.</p>
            ) : intro.expired ? (
                <p>This request has expired.</p>
            ) : (
                <IntroResponse token={token} channelName={intro.channelName} note={intro.note} initialChoice={choice === 'decline' ? 'decline' : choice === 'accept' ? 'accept' : null} />
            )}
        </div>
    );
}
