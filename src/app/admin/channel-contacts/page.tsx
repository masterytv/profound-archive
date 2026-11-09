import { listChannelRows } from '@/lib/share/contacts';
import ChannelContactsTable from '@/components/share/ChannelContactsTable';

export const dynamic = 'force-dynamic';

/** Channels & Contacts: every channel on PP plus hand-added ones, with contact details (admins only, via the admin layout). */
export default async function ChannelContactsPage() {
    const { rows, tableMissing } = await listChannelRows();
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Channels &amp; Contacts</h1>
                <p className="text-sm text-slate-500">
                    Every channel on Project Profound, with who runs it, how to reach them and whether they have access to the experiencer directory.
                    Contact details are private: only admins can see them.
                </p>
            </header>
            {tableMissing && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    The <code>channel_contacts</code> table doesn&apos;t exist yet, so contact details can&apos;t be saved. Run{' '}
                    <code>supabase/migrations/20261109_005_channel_contacts.sql</code> in the Supabase SQL editor.
                </p>
            )}
            <ChannelContactsTable rows={rows} />
        </div>
    );
}
