import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CONDUCT_VERSION, isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { memberStatus } from '@/lib/share/channels';
import ConductForm from '@/components/share/ConductForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Channel code of conduct | Project Profound', robots: { index: false } };

export default async function ConductPage() {
    if (!isShareEnabled()) notFound();
    const user = await currentUser();
    if (!user) redirect('/login?returnTo=/channels/conduct');
    const { memberships, conductAccepted } = await memberStatus(user.id);
    if (!memberships.length) notFound();

    return (
        <article className="max-w-2xl mx-auto px-4 py-12 space-y-6">
            <div className="prose prose-slate dark:prose-invert">
                <h1>Code of conduct for channels</h1>
                <p className="text-sm text-slate-500">Version {CONDUCT_VERSION}</p>
                <p>The people in this directory have trusted Project Profound with deeply personal experiences. Access is a privilege we extend to channels we know. By using the directory you agree to:</p>
                <ol>
                    <li><strong>Respect their choice.</strong> Ask once, through the directory. If someone declines or doesn&apos;t answer, don&apos;t look for other ways to reach them.</li>
                    <li><strong>No scraping or copying.</strong> Don&apos;t copy, export or republish directory entries or summaries.</li>
                    <li><strong>No pressure, no fees.</strong> Never ask a guest to pay to appear, and don&apos;t pressure anyone to share more than they want.</li>
                    <li><strong>Protect anonymity.</strong> If someone is listed as anonymous, never try to identify them. Agree with them how they&apos;ll be presented before you record.</li>
                    <li><strong>Care.</strong> Some experiences involve trauma, illness or suicide attempts. Handle them with sensitivity and point to support resources where appropriate.</li>
                    <li><strong>Be honest</strong> about who you are, what the interview is for and where it will appear.</li>
                </ol>
                <p>Project Profound can withdraw access at any time.</p>
            </div>
            {conductAccepted ? <p className="text-emerald-700">You have accepted this code of conduct. <a href="/channels/directory" className="underline">Go to the directory</a>.</p> : <ConductForm />}
        </article>
    );
}
