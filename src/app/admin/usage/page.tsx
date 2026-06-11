import { Suspense } from 'react';
import UsageDashboard from './usage-dashboard';

export const metadata = {
    title: 'API Usage & Cost | Admin — Project Profound',
};

export default function UsagePage() {
    return (
        <Suspense fallback={
            <div className="space-y-6">
                <div className="h-10 w-56 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
                <div className="h-64 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
        }>
            <UsageDashboard />
        </Suspense>
    );
}
