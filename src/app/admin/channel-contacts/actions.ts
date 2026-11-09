'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/share/db';
import { addChannel, deleteContact, importContactsCsv, saveContact, type contactSchema, CHANNEL_TYPES } from '@/lib/share/contacts';

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof z.ZodError ? err.issues[0]?.message ?? 'Please check the form.' : err instanceof Error ? err.message : 'Something went wrong.',
});

export async function saveContactAction(input: z.input<typeof contactSchema>): Promise<Result> {
    try {
        await requireAdmin();
        await saveContact(input);
        revalidatePath('/admin/channel-contacts');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function addChannelAction(name: string, ref: string, type: (typeof CHANNEL_TYPES)[number]): Promise<Result<{ channelId: string }>> {
    try {
        await requireAdmin();
        const channelId = await addChannel(name, ref, type);
        revalidatePath('/admin/channel-contacts');
        return { ok: true, data: { channelId } };
    } catch (err) {
        return fail(err);
    }
}

export async function deleteContactAction(channelId: string): Promise<Result> {
    try {
        await requireAdmin();
        await deleteContact(channelId);
        revalidatePath('/admin/channel-contacts');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function importContactsAction(csv: string): Promise<Result<{ added: number; updated: number; skipped: number }>> {
    try {
        await requireAdmin();
        if (csv.length > 2_000_000) throw new Error('That file is too large.');
        const data = await importContactsCsv(csv);
        revalidatePath('/admin/channel-contacts');
        return { ok: true, data };
    } catch (err) {
        return fail(err);
    }
}
