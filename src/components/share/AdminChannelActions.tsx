'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resendInviteAction, revokeInviteAction, revokeMemberAction } from '@/app/admin/share/actions';

function useRun() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
        setBusy(true);
        setError(null);
        const res = await fn();
        setBusy(false);
        if (!res.ok) setError(res.error ?? 'Failed');
        else router.refresh();
    };
    return { busy, error, run };
}

export function AdminInviteActions({ id }: { id: string }) {
    const { busy, error, run } = useRun();
    return (
        <span className="flex gap-3">
            <button className="underline" disabled={busy} onClick={() => run(() => resendInviteAction(id))}>Resend</button>
            <button className="underline text-red-600" disabled={busy} onClick={() => run(() => revokeInviteAction(id))}>Revoke</button>
            {error && <span className="text-red-600">{error}</span>}
        </span>
    );
}

export function AdminMemberRevoke({ id }: { id: number }) {
    const { busy, error, run } = useRun();
    return (
        <span>
            <button className="underline text-red-600" disabled={busy} onClick={() => confirm('Revoke directory access?') && run(() => revokeMemberAction(id))}>Revoke</button>
            {error && <span className="text-red-600 ml-2">{error}</span>}
        </span>
    );
}
