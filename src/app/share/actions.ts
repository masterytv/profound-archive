'use server';

/**
 * Server actions for /share (experiencers). Every action re-checks the
 * feature flag and the signed-in user; ownership is checked in src/lib/share.
 */
import { z } from 'zod';
import { AGREEMENT_VERSION, isShareEnabled } from '@/lib/share/config';
import { currentUser, shareAdmin } from '@/lib/share/db';
import {
    attachMedia,
    changeDisplayMode,
    createDraft,
    deleteOwnStory,
    editStoryText,
    finishReview,
    recordAgreement,
    setSuggestionStatus,
    submitStory,
    type DraftInput,
} from '@/lib/share/stories';
import { respondToIntro } from '@/lib/share/channels';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Please check the form.' };
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('[share/actions]', message);
    return { ok: false, error: message };
}

async function signedInUser() {
    if (!isShareEnabled()) throw new Error('Sharing is not open yet.');
    const user = await currentUser();
    if (!user) throw new Error('Please sign in first.');
    return user;
}

export async function acceptAgreementAction(ageConfirmed: boolean, agreed: boolean): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        if (!ageConfirmed) throw new Error('You must be 18 or older to share.');
        if (!agreed) throw new Error('Please accept the agreement to continue.');
        await recordAgreement(user.id, 'experiencer', AGREEMENT_VERSION, true);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function createDraftAction(input: DraftInput): Promise<ActionResult<{ storyId: string; uploadPrefix: string }>> {
    try {
        const user = await signedInUser();
        const { story, uploadPrefix } = await createDraft(user.id, input);
        return { ok: true, data: { storyId: story.id, uploadPrefix } };
    } catch (err) {
        return fail(err);
    }
}

export async function attachMediaAction(storyId: string, path: string, mime: string): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        await attachMedia(user.id, storyId, path, mime);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function submitStoryAction(storyId: string): Promise<ActionResult<{ status: string }>> {
    try {
        const user = await signedInUser();
        const status = await submitStory(user.id, storyId);
        return { ok: true, data: { status } };
    } catch (err) {
        return fail(err);
    }
}

export async function setSuggestionAction(suggestionId: number, status: 'accepted' | 'rejected' | 'pending'): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        await setSuggestionStatus(user.id, suggestionId, status);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function finishReviewAction(storyId: string, title: string): Promise<ActionResult<{ status: 'published' | 'held' }>> {
    try {
        const user = await signedInUser();
        const status = await finishReview(user.id, storyId, { title });
        return { ok: true, data: { status } };
    } catch (err) {
        return fail(err);
    }
}

export async function editStoryAction(storyId: string, text: string, title: string): Promise<ActionResult<{ status: 'published' | 'held' }>> {
    try {
        const user = await signedInUser();
        const status = await editStoryText(user.id, storyId, text, title);
        return { ok: true, data: { status } };
    } catch (err) {
        return fail(err);
    }
}

export async function changeDisplayModeAction(storyId: string, mode: 'named' | 'anonymous', displayName: string): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        await changeDisplayMode(user.id, storyId, mode, displayName);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function deleteStoryAction(storyId: string): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        await deleteOwnStory(user.id, storyId);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

const contactSchema = z.object({
    phone: z.string().trim().max(40).optional().default(''),
    website: z.string().trim().max(200).optional().default(''),
    other: z.string().trim().max(300).optional().default(''),
});

/** Optional extra contact details. Visible only to PP admins, and shared only in an accepted introduction. */
export async function saveContactsAction(input: z.input<typeof contactSchema>): Promise<ActionResult> {
    try {
        const user = await signedInUser();
        const v = contactSchema.parse(input);
        const { error } = await shareAdmin()
            .from('share_contacts')
            .upsert({ user_id: user.id, phone: v.phone || null, website: v.website || null, other: v.other || null, updated_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

/** Accept/decline from the emailed link. The token is the credential (no sign-in needed). */
export async function respondToIntroAction(
    token: string,
    choice: 'accept' | 'decline',
    extras: { phone?: boolean; website?: boolean; other?: boolean },
): Promise<ActionResult> {
    try {
        if (!isShareEnabled()) throw new Error('Sharing is not open yet.');
        await respondToIntro(token, choice, extras);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}
