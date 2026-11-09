import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { redeemInvite } from '@/lib/share/channels';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Join the guest directory | Project Profound', robots: { index: false } };

const REASONS: Record<string, string> = {
    invalid: 'This invitation link isn’t valid.',
    expired: 'This invitation has expired. Please ask Project Profound for a new one.',
    used: 'This invitation has already been used.',
    revoked: 'This invitation was withdrawn.',
    wrong_email: 'This invitation was sent to a different email address. Please sign out and sign in with the address the invitation was sent to.',
};

/**
 * Invite redemption. Visiting with a token while signed in redeems it (the
 * token is single-use and bound to the invited email address).
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    if (!isShareEnabled()) notFound();
    const { token } = await searchParams;
    const user = await currentUser();

    if (!token) {
        return <Shell><p>Channel access is by invitation from Project Profound. If you run a channel and would like to join, email <a className="underline" href="mailto:hello@projectprofound.org">hello@projectprofound.org</a>.</p></Shell>;
    }
    if (!user || !user.email) {
        const returnTo = `/channels/join?token=${encodeURIComponent(token)}`;
        return (
            <Shell>
                <p>Please sign in with the email address your invitation was sent to. You&apos;ll come straight back here.</p>
                <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-white font-medium">Sign in</Link>
            </Shell>
        );
    }

    const result = await redeemInvite(user.id, user.email, token);
    if (!result.ok) {
        return <Shell><p>{REASONS[result.reason]}</p>{result.reason === 'used' && <Link href="/channels/directory" className="underline text-indigo-600">Go to the directory</Link>}</Shell>;
    }
    return (
        <Shell>
            <p>Welcome. You now have access to the guest directory for <b>{result.channels.join(', ')}</b>.</p>
            <Link href="/channels/conduct" className="inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-white font-medium">Continue</Link>
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="max-w-xl mx-auto px-4 py-12 space-y-5">
            <h1 className="text-3xl font-serif">Project Profound guest directory</h1>
            {children}
        </div>
    );
}
