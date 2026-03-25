'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Delete blog post button — removes from DB so the pipeline can re-process it.
 * Uses confirm() dialog to prevent accidental deletion.
 */
export function DeletePostButton({ id, title }: { id: number; title: string }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(
            `Delete "${title}"?\n\nThis permanently removes the post from the database so the pipeline can regenerate it. This cannot be undone.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                alert(`Delete failed: ${data.error}`);
                return;
            }
            // Refresh the page to reflect changes
            router.refresh();
        } catch (err) {
            alert(`Delete failed: ${err}`);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50"
            title="Delete post from database (allows re-generation)"
        >
            <Trash2 className="w-3 h-3" />
            {deleting ? 'Deleting…' : 'Delete'}
        </button>
    );
}
