import Link from 'next/link';
import { shareAdmin } from '@/lib/share/db';
import { visibleTestValues } from '@/lib/share/config';
import { listFeaturedChannels } from '@/lib/share/channels';
import { getUserEmail } from '@/lib/share/stories';
import InviteForm from '@/components/share/InviteForm';
import { AdminInviteActions, AdminMemberRevoke } from '@/components/share/AdminChannelActions';

export const dynamic = 'force-dynamic';

export default async function AdminShareChannelsPage({ searchParams }: { searchParams: Promise<{ email?: string; cid?: string; cname?: string }> }) {
    const sp = await searchParams;
    const db = shareAdmin();
    const [channels, invitesRes, membersRes, introsRes] = await Promise.all([
        listFeaturedChannels().catch(() => []),
        db.from('share_channel_invites').select('*').in('is_test', visibleTestValues()).order('created_at', { ascending: false }).limit(100),
        db.from('share_channel_members').select('*').order('granted_at', { ascending: false }).limit(200),
        db.from('share_intro_requests').select('id, status, channel_name, created_at, opened_at, responded_at, story_id, is_test').in('is_test', visibleTestValues()).order('created_at', { ascending: false }).limit(100),
    ]);
    const invites = invitesRes.data ?? [];
    const members = membersRes.data ?? [];
    const intros = introsRes.data ?? [];
    const memberEmails = new Map<string, string | null>();
    await Promise.all([...new Set(members.map((m) => m.user_id as string))].map(async (id) => memberEmails.set(id, await getUserEmail(id))));

    const inviteState = (i: (typeof invites)[number]) =>
        i.revoked_at ? 'revoked' : i.used_at ? 'accepted' : new Date(i.expires_at) < new Date() ? 'expired' : 'pending';

    return (
        <div className="space-y-10">
            <header>
                <Link href="/admin/share" className="text-sm underline">← Shared experiences</Link>
                <h1 className="text-2xl font-bold mt-2">Channel invites &amp; introductions</h1>
                <p className="text-sm text-slate-500">Invite a channel owner only after you&apos;ve spoken with them. The invite link works once, only for that email, for 7 days.</p>
            </header>
            {invitesRes.error && <p className="text-red-600 text-sm">Could not load: {invitesRes.error.message}. Have the share migrations been run?</p>}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Send an invite</h2>
                <InviteForm
                    channels={channels.map((c) => ({ channel_id: c.channel_id, name: c.name, vertical: c.vertical }))}
                    initialEmail={sp.email ?? ''}
                    initialChannel={sp.cid && sp.cname ? { channel_id: sp.cid, name: sp.cname, vertical: 'other' } : null}
                />
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Invites</h2>
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500"><th>Email</th><th>Channels</th><th>Status</th><th>Sent</th><th /></tr></thead>
                    <tbody>
                        {invites.map((i) => (
                            <tr key={i.id} className="border-t">
                                <td className="py-2">{i.email}{i.is_test ? ' (test)' : ''}</td>
                                <td>{((i.channels ?? []) as Array<{ channel_name: string }>).map((c) => c.channel_name).join(', ')}</td>
                                <td>{inviteState(i)}</td>
                                <td>{new Date(i.created_at).toLocaleDateString()}</td>
                                <td>{inviteState(i) === 'pending' || inviteState(i) === 'expired' ? <AdminInviteActions id={i.id} /> : null}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Members</h2>
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500"><th>Email</th><th>Channel</th><th>Since</th><th>Status</th><th /></tr></thead>
                    <tbody>
                        {members.map((m) => (
                            <tr key={m.id} className="border-t">
                                <td className="py-2">{memberEmails.get(m.user_id) ?? m.user_id}</td>
                                <td>{m.channel_name ?? m.channel_id}</td>
                                <td>{new Date(m.granted_at).toLocaleDateString()}</td>
                                <td>{m.revoked_at ? 'revoked' : 'active'}</td>
                                <td>{!m.revoked_at && <AdminMemberRevoke id={m.id} />}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Introduction requests</h2>
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500"><th>Channel</th><th>Requested</th><th>Opened</th><th>Status</th></tr></thead>
                    <tbody>
                        {intros.map((r) => (
                            <tr key={r.id} className="border-t">
                                <td className="py-2">{r.channel_name}{r.is_test ? ' (test)' : ''}</td>
                                <td>{new Date(r.created_at).toLocaleString()}</td>
                                <td>{r.opened_at ? new Date(r.opened_at).toLocaleString() : '–'}</td>
                                <td>{r.status}{r.responded_at ? ` (${new Date(r.responded_at).toLocaleDateString()})` : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
