import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PenLine, Mic, Video, Upload, Lock, Globe } from 'lucide-react';
import { AGREEMENT_VERSION, isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { hasAcceptedAgreement } from '@/lib/share/stories';
import { listFeaturedChannels } from '@/lib/share/channels';
import ShareWizard from '@/components/share/ShareWizard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Share your experience | Project Profound',
    description: 'Share your near-death, spiritual or contact experience with Project Profound, by writing, audio or video, with your name or anonymously.',
};

export default async function SharePage() {
    if (!isShareEnabled()) notFound();
    const user = await currentUser();

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
            <header className="space-y-3">
                <p className="text-sm uppercase tracking-widest text-indigo-500">Share your experience</p>
                <h1 className="text-4xl font-serif leading-tight">Your experience matters. Tell it in your own words.</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                    Near-death experiences, spiritually transformative experiences, encounters and contact: share yours by writing, with your voice, or on video.
                </p>
            </header>

            {!user ? (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        {[
                            [PenLine, 'Write it, or upload a document'],
                            [Mic, 'Record your voice, or upload audio'],
                            [Video, 'Record or upload a video (with your name)'],
                            [Upload, 'Pause and come back any time'],
                        ].map(([Icon, text], i) => {
                            const I = Icon as typeof PenLine;
                            return (
                                <div key={i} className="flex gap-3 items-center rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                    <I className="h-5 w-5 text-indigo-500" /> {text as string}
                                </div>
                            );
                        })}
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-5 space-y-2 text-slate-700 dark:text-slate-300">
                        <p className="flex gap-2"><Globe className="h-5 w-5 text-indigo-500 shrink-0" /> What you share is published on projectprofound.org and the Project Profound YouTube channel.</p>
                        <p className="flex gap-2"><Lock className="h-5 w-5 text-indigo-500 shrink-0" /> You choose whether your name is shown. Your contact details are never public.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/login?returnTo=/share" className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-3 text-white font-medium hover:bg-indigo-700">
                            Sign in to share
                        </Link>
                        <Link href="/experiences" className="text-indigo-600 underline">Watch, listen to or read shared experiences</Link>
                    </div>
                    <p className="text-sm text-slate-500">
                        Signing in lets you come back, edit or delete your story later. You can sign in with Google or with a link sent to your email. Read the{' '}
                        <Link href="/share/agreement" className="underline">Experiencer Agreement</Link>.
                    </p>
                </div>
            ) : (
                <ShareWizardLoader userId={user.id} defaultName={(user.user_metadata?.full_name as string | undefined) ?? ''} />
            )}
        </div>
    );
}

async function ShareWizardLoader({ userId, defaultName }: { userId: string; defaultName: string }) {
    const [accepted, channels] = await Promise.all([
        hasAcceptedAgreement(userId, 'experiencer', AGREEMENT_VERSION),
        listFeaturedChannels().catch(() => []),
    ]);
    return (
        <>
            <p className="text-sm flex flex-wrap gap-x-5 gap-y-1">
                <Link href="/share/my-experiences" className="text-indigo-600 underline">My experiences</Link>
                <Link href="/experiences" className="text-indigo-600 underline">All shared experiences</Link>
            </p>
            <ShareWizard
                needsAgreement={!accepted}
                defaultName={defaultName}
                channels={channels.map((c) => ({ channel_id: c.channel_id, name: c.name, vertical: c.vertical }))}
            />
        </>
    );
}
