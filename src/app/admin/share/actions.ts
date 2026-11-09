'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/share/db';
import { adminReleaseHeld, adminSetRemoved, deleteStoryCompletely, getStoryById, prepareReview, completeTranscription } from '@/lib/share/stories';
import { createInvite, resendInvite, revokeInvite, revokeMember } from '@/lib/share/channels';

type Result = { ok: true } | { ok: false; error: string };
const fail = (err: unknown): Result => ({ ok: false, error: err instanceof Error ? err.message : 'Something went wrong.' });

export async function releaseHeldAction(storyId: string, acceptedIds: number[], manualText: string | null): Promise<Result> {
    try {
        await requireAdmin();
        await adminReleaseHeld(storyId, { acceptedIds, manualText });
        revalidatePath('/admin/share');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function setRemovedAction(storyId: string, removed: boolean): Promise<Result> {
    try {
        await requireAdmin();
        await adminSetRemoved(storyId, removed);
        revalidatePath('/admin/share');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function adminDeleteAction(storyId: string): Promise<Result> {
    try {
        await requireAdmin();
        const story = await getStoryById(storyId);
        if (!story) throw new Error('Story not found.');
        await deleteStoryCompletely(story);
        revalidatePath('/admin/share');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

/** Retry a stuck story: re-fetch the transcript, or re-run editor suggestions. */
export async function retryProcessingAction(storyId: string): Promise<Result> {
    try {
        await requireAdmin();
        const story = await getStoryById(storyId);
        if (!story) throw new Error('Story not found.');
        if (story.status === 'processing' && story.transcript_id) await completeTranscription(story.transcript_id);
        else if (story.status === 'reviewing' && story.original_text) await prepareReview(story.id, story.original_text);
        else throw new Error('Nothing to retry for this story.');
        revalidatePath('/admin/share');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function createInviteAction(email: string, channels: Array<{ channel_id: string; channel_name: string }>): Promise<Result> {
    try {
        const admin = await requireAdmin();
        await createInvite(admin.id, { email, channels });
        revalidatePath('/admin/share/channels');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function resendInviteAction(id: string): Promise<Result> {
    try {
        await requireAdmin();
        await resendInvite(id);
        revalidatePath('/admin/share/channels');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function revokeInviteAction(id: string): Promise<Result> {
    try {
        await requireAdmin();
        await revokeInvite(id);
        revalidatePath('/admin/share/channels');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function revokeMemberAction(id: number): Promise<Result> {
    try {
        await requireAdmin();
        await revokeMember(id);
        revalidatePath('/admin/share/channels');
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}
