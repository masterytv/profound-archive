'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { acceptConductAction } from '@/app/channels/actions';

export default function ConductForm() {
    const router = useRouter();
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    return (
        <div className="space-y-3">
            <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to this code of conduct on behalf of my channel.</span>
            </label>
            <Button
                disabled={!agreed || busy}
                onClick={async () => {
                    setBusy(true);
                    const res = await acceptConductAction(agreed);
                    setBusy(false);
                    if (!res.ok) return setError(res.error);
                    router.push('/channels/directory');
                }}
            >
                Accept and open the directory
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
