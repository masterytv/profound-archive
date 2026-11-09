'use server';

import { z } from 'zod';
import { CONDUCT_VERSION, isShareEnabled } from '@/lib/share/config';
import { currentUser } from '@/lib/share/db';
import { recordAgreement } from '@/lib/share/stories';
import { activeMemberships, requestIntro, type introSchema } from '@/lib/share/channels';

type Result = { ok: true } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Please check the form.' };
    return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong.' };
}

async function member() {
    if (!isShareEnabled()) throw new Error('Not available.');
    const user = await currentUser();
    if (!user) throw new Error('Please sign in.');
    if (!(await activeMemberships(user.id)).length) throw new Error('This area is for invited channel members.');
    return user;
}

export async function acceptConductAction(agreed: boolean): Promise<Result> {
    try {
        const user = await member();
        if (!agreed) throw new Error('Please tick the box to accept.');
        await recordAgreement(user.id, 'channel_conduct', CONDUCT_VERSION, true);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}

export async function requestIntroAction(input: z.input<typeof introSchema>): Promise<Result> {
    try {
        const user = await member();
        await requestIntro(user.id, input);
        return { ok: true };
    } catch (err) {
        return fail(err);
    }
}
