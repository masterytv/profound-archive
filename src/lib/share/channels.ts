/**
 * Channels: the picker list, invite-only membership, the guest directory and
 * PP-mediated introductions. Channel members never receive an experiencer's
 * contact details unless the experiencer accepts an introduction.
 */
import { z } from 'zod';
import { shareAdmin } from './db';
import {
    CONDUCT_VERSION,
    INTRO_TTL_DAYS,
    INTROS_PER_WEEK,
    INVITE_TTL_DAYS,
    isTestEnvironment,
    siteUrl,
    visibleTestValues,
} from './config';
import { hashToken, newToken } from './tokens';
import { publicDisplayName } from './text';
import { sendEmail } from './send';
import { channelInviteEmail, introAcceptedEmail, introDeclinedEmail, introRequestEmail } from './emails';
import { getUserEmail, hasAcceptedAgreement } from './stories';

const db = () => shareAdmin();

// ─── Channel list (for pickers) ────────────────────────────────────────────

export interface ChannelOption {
    channel_id: string;
    name: string;
    /** 'other': a channel added by hand in an invite (not in PP's video database). */
    vertical: 'nde' | 'uap' | 'other';
    subscribers: number;
}

/** The channels featured on PP: the NDE list (/channels) plus visible UAP channels. */
export async function listFeaturedChannels(): Promise<ChannelOption[]> {
    const [nde, uap] = await Promise.all([
        db().rpc('get_channel_stats'),
        db().from('uap_channels').select('channel_id, channel_name, subscriber_count, hidden, video_count').eq('hidden', false).gt('video_count', 0),
    ]);
    const out = new Map<string, ChannelOption>();
    for (const c of (nde.data ?? []) as Array<{ channel_id: string; channel_name: string; subscriber_count: number | null }>) {
        out.set(c.channel_id, { channel_id: c.channel_id, name: c.channel_name, vertical: 'nde', subscribers: Number(c.subscriber_count ?? 0) });
    }
    for (const c of (uap.data ?? []) as Array<{ channel_id: string; channel_name: string; subscriber_count: number | null }>) {
        if (!out.has(c.channel_id)) {
            out.set(c.channel_id, { channel_id: c.channel_id, name: c.channel_name, vertical: 'uap', subscribers: Number(c.subscriber_count ?? 0) });
        }
    }
    // Hidden NDE channels (removed from the site) must not be offered.
    const ids = [...out.keys()];
    if (ids.length) {
        const { data: hidden } = await db().from('channels').select('channel_id').in('channel_id', ids).eq('hidden', true);
        for (const h of hidden ?? []) out.delete(h.channel_id as string);
    }
    // Channels added by hand in an invite (e.g. a podcast with no videos on PP yet).
    const { data: members } = await db().from('share_channel_members').select('channel_id, channel_name').is('revoked_at', null);
    for (const m of (members ?? []) as Array<{ channel_id: string; channel_name: string | null }>) {
        if (!out.has(m.channel_id)) out.set(m.channel_id, { channel_id: m.channel_id, name: m.channel_name ?? m.channel_id, vertical: 'other', subscribers: 0 });
    }
    return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Turn what an admin pastes (a YouTube channel URL, an @handle, or a UC… channel
 * ID) into the channel_id we store. Returns null if it isn't recognisable.
 */
export function normalizeChannelRef(input: string): string | null {
    const s = input.trim();
    const id = s.match(/(UC[\w-]{22})/);
    if (id) return id[1];
    const handle = s.match(/(?:youtube\.com\/)?@([\w.-]{3,30})/i) ?? s.match(/^([\w.-]{3,30})$/);
    return handle ? `@${handle[1].toLowerCase()}` : null;
}

// ─── Membership ────────────────────────────────────────────────────────────

export interface Membership {
    channel_id: string;
    channel_name: string | null;
}

export async function activeMemberships(userId: string): Promise<Membership[]> {
    const { data } = await db()
        .from('share_channel_members')
        .select('channel_id, channel_name')
        .eq('user_id', userId)
        .is('revoked_at', null);
    return (data ?? []) as Membership[];
}

export async function memberStatus(userId: string): Promise<{ memberships: Membership[]; conductAccepted: boolean }> {
    const memberships = await activeMemberships(userId);
    const conductAccepted = memberships.length ? await hasAcceptedAgreement(userId, 'channel_conduct', CONDUCT_VERSION) : false;
    return { memberships, conductAccepted };
}

// ─── Invites ───────────────────────────────────────────────────────────────

export const inviteSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    channels: z
        .array(z.object({ channel_id: z.string().min(1).max(64), channel_name: z.string().max(200) }))
        .min(1, 'Choose at least one channel.')
        .max(20),
});

export async function createInvite(adminId: string, raw: z.input<typeof inviteSchema>) {
    const input = inviteSchema.parse(raw);
    const token = newToken();
    const { data, error } = await db()
        .from('share_channel_invites')
        .insert({
            email: input.email,
            channels: input.channels,
            token_hash: hashToken(token),
            expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString(),
            created_by: adminId,
            is_test: isTestEnvironment(),
        })
        .select('id')
        .single();
    if (error) throw new Error(error.message);
    const messageId = await sendEmail(channelInviteEmail(input.email, token, input.channels.map((c) => c.channel_name)));
    if (!messageId) throw new Error('The invite was saved but the email could not be sent. Check RESEND_API_KEY, then use "Resend".');
    return data.id as string;
}

/** Re-issue the token for an unused invite (the old link stops working). */
export async function resendInvite(inviteId: string) {
    const { data: invite } = await db().from('share_channel_invites').select('*').eq('id', inviteId).maybeSingle();
    if (!invite || invite.used_at || invite.revoked_at) throw new Error('This invite can no longer be resent.');
    const token = newToken();
    await db()
        .from('share_channel_invites')
        .update({ token_hash: hashToken(token), expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString() })
        .eq('id', inviteId);
    const channels = (invite.channels ?? []) as Array<{ channel_name: string }>;
    const messageId = await sendEmail(channelInviteEmail(invite.email, token, channels.map((c) => c.channel_name)));
    if (!messageId) throw new Error('The email could not be sent.');
}

export async function revokeInvite(inviteId: string) {
    await db().from('share_channel_invites').update({ revoked_at: new Date().toISOString() }).eq('id', inviteId).is('used_at', null);
}

export type RedeemResult = { ok: true; channels: string[] } | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' | 'wrong_email' };

/** Turn an invite into memberships. The signed-in email must match the invite. */
export async function redeemInvite(userId: string, userEmail: string, token: string): Promise<RedeemResult> {
    const { data: invite } = await db().from('share_channel_invites').select('*').eq('token_hash', hashToken(token)).maybeSingle();
    if (!invite) return { ok: false, reason: 'invalid' };
    if (invite.revoked_at) return { ok: false, reason: 'revoked' };
    if (invite.used_at) return { ok: false, reason: invite.used_by === userId ? 'used' : 'invalid' };
    if (new Date(invite.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) return { ok: false, reason: 'wrong_email' };

    // Mark used first (only if still unused) so a token can't be redeemed twice.
    const { data: claimed } = await db()
        .from('share_channel_invites')
        .update({ used_at: new Date().toISOString(), used_by: userId })
        .eq('id', invite.id)
        .is('used_at', null)
        .select('id');
    if (!claimed?.length) return { ok: false, reason: 'used' };

    const channels = (invite.channels ?? []) as Array<{ channel_id: string; channel_name: string }>;
    const { error } = await db()
        .from('share_channel_members')
        .upsert(
            channels.map((c) => ({
                user_id: userId,
                channel_id: c.channel_id,
                channel_name: c.channel_name,
                granted_by: invite.created_by,
                granted_at: new Date().toISOString(),
                revoked_at: null,
            })),
            { onConflict: 'user_id,channel_id' },
        );
    if (error) throw new Error(error.message);
    return { ok: true, channels: channels.map((c) => c.channel_name) };
}

export async function revokeMember(memberRowId: number) {
    await db().from('share_channel_members').update({ revoked_at: new Date().toISOString() }).eq('id', memberRowId);
}

// ─── Directory ─────────────────────────────────────────────────────────────

export interface DirectoryEntry {
    storyId: string;
    slug: string;
    displayName: string;
    experienceType: string;
    title: string;
    summary: string;
    place: string | null;
    language: string;
    appearancePref: string;
    publishedAt: string | null;
    /** The member's channels this person agreed to be introduced to. */
    eligibleChannels: Membership[];
}

interface DirectoryRow {
    id: string;
    slug: string;
    display_mode: 'named' | 'anonymous';
    display_name: string | null;
    anon_number: number;
    experience_type: string;
    title: string | null;
    summary: string | null;
    body_text: string | null;
    country: string | null;
    region: string | null;
    language: string;
    appearance_pref: string;
    published_at: string | null;
    intro_mode: 'all' | 'selected';
}

/** Directory fields only (PRD F19). No contact details, no user id. */
export function toDirectoryEntry(row: DirectoryRow, eligible: Membership[]): DirectoryEntry {
    const anonymous = row.display_mode !== 'named';
    const fallbackSummary = (row.body_text ?? '').slice(0, 280).trim();
    return {
        storyId: row.id,
        slug: row.slug,
        displayName: publicDisplayName(row),
        experienceType: row.experience_type,
        title: row.title || 'An experience',
        summary: row.summary || (fallbackSummary ? `${fallbackSummary}…` : ''),
        place: anonymous ? row.region : row.country || row.region,
        language: row.language,
        appearancePref: row.appearance_pref,
        publishedAt: row.published_at,
        eligibleChannels: eligible,
    };
}

export async function listDirectory(userId: string, filters: { type?: string; q?: string } = {}): Promise<DirectoryEntry[]> {
    const memberships = await activeMemberships(userId);
    if (!memberships.length) return [];
    const memberChannelIds = memberships.map((m) => m.channel_id);

    let q = db()
        .from('share_stories')
        .select('id, slug, display_mode, display_name, anon_number, experience_type, title, summary, body_text, country, region, language, appearance_pref, published_at, intro_mode')
        .eq('status', 'published')
        .in('intro_mode', ['all', 'selected'])
        .in('is_test', visibleTestValues())
        .order('published_at', { ascending: false })
        .limit(300);
    if (filters.type) q = q.eq('experience_type', filters.type);
    const { data: rows } = await q;
    const stories = (rows ?? []) as DirectoryRow[];

    const selectedIds = stories.filter((s) => s.intro_mode === 'selected').map((s) => s.id);
    const chosen = new Map<string, Set<string>>();
    if (selectedIds.length) {
        const { data: links } = await db().from('share_intro_channels').select('story_id, channel_id').in('story_id', selectedIds).in('channel_id', memberChannelIds);
        for (const l of links ?? []) {
            if (!chosen.has(l.story_id)) chosen.set(l.story_id, new Set());
            chosen.get(l.story_id)!.add(l.channel_id);
        }
    }

    const needle = filters.q?.trim().toLowerCase();
    return stories
        .map((s) => {
            const eligible = s.intro_mode === 'all' ? memberships : memberships.filter((m) => chosen.get(s.id)?.has(m.channel_id));
            return eligible.length ? toDirectoryEntry(s, eligible) : null;
        })
        .filter((e): e is DirectoryEntry => Boolean(e))
        .filter((e) => !needle || `${e.title} ${e.summary} ${e.displayName}`.toLowerCase().includes(needle));
}

// ─── Introductions ─────────────────────────────────────────────────────────

export const introSchema = z.object({
    storyId: z.string().uuid(),
    channelId: z.string().min(1).max(64),
    note: z.string().trim().min(20, 'Please write a short note (at least a sentence).').max(1500),
});

export async function requestIntro(userId: string, raw: z.input<typeof introSchema>) {
    const input = introSchema.parse(raw);
    const memberships = await activeMemberships(userId);
    const membership = memberships.find((m) => m.channel_id === input.channelId);
    if (!membership) throw new Error('You are not a member for that channel.');
    if (!(await hasAcceptedAgreement(userId, 'channel_conduct', CONDUCT_VERSION))) throw new Error('Please accept the code of conduct first.');

    // The story must currently be in this member's directory for that channel.
    const entries = await listDirectory(userId);
    const entry = entries.find((e) => e.storyId === input.storyId);
    if (!entry || !entry.eligibleChannels.some((c) => c.channel_id === input.channelId)) {
        throw new Error('This person is not open to introductions from that channel.');
    }

    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { count } = await db()
        .from('share_intro_requests')
        .select('id', { count: 'exact', head: true })
        .eq('member_user_id', userId)
        .gte('created_at', weekAgo);
    if ((count ?? 0) >= INTROS_PER_WEEK) throw new Error(`You can send up to ${INTROS_PER_WEEK} introduction requests a week.`);

    const { data: pending } = await db()
        .from('share_intro_requests')
        .select('id')
        .eq('story_id', input.storyId)
        .eq('member_user_id', userId)
        .in('status', ['pending', 'accepted'])
        .limit(1);
    if (pending?.length) throw new Error('You have already asked for this introduction.');

    const { data: story } = await db().from('share_stories').select('user_id, is_test').eq('id', input.storyId).single();
    const experiencerEmail = story ? await getUserEmail(story.user_id) : null;
    if (!experiencerEmail) throw new Error('This person cannot be reached right now.');

    const token = newToken();
    const { data: row, error } = await db()
        .from('share_intro_requests')
        .insert({
            story_id: input.storyId,
            member_user_id: userId,
            channel_id: input.channelId,
            channel_name: membership.channel_name,
            note: input.note,
            response_token_hash: hashToken(token),
            is_test: story?.is_test ?? isTestEnvironment(),
        })
        .select('id')
        .single();
    if (error) throw new Error(error.message);

    const messageId = await sendEmail(
        introRequestEmail({ to: experiencerEmail, token, channelName: membership.channel_name ?? 'A channel', note: input.note }),
        { track: true },
    );
    if (messageId) await db().from('share_intro_requests').update({ resend_message_id: messageId }).eq('id', row.id);
}

export interface IntroForResponse {
    id: string;
    status: string;
    channelName: string;
    note: string;
    expired: boolean;
}

export async function getIntroByToken(token: string): Promise<IntroForResponse | null> {
    const { data } = await db().from('share_intro_requests').select('id, status, channel_name, note, created_at').eq('response_token_hash', hashToken(token)).maybeSingle();
    if (!data) return null;
    const expired = Date.now() - new Date(data.created_at).getTime() > INTRO_TTL_DAYS * 86400_000;
    return { id: data.id, status: data.status, channelName: data.channel_name ?? 'A channel', note: data.note, expired };
}

/** The experiencer accepts or declines (from the emailed link, no sign-in needed). */
export async function respondToIntro(token: string, choice: 'accept' | 'decline', shareExtras: { phone?: boolean; website?: boolean; other?: boolean } = {}) {
    const { data: intro } = await db().from('share_intro_requests').select('*').eq('response_token_hash', hashToken(token)).maybeSingle();
    if (!intro) throw new Error('This link is not valid.');
    if (intro.status !== 'pending') throw new Error('You have already answered this request.');
    if (Date.now() - new Date(intro.created_at).getTime() > INTRO_TTL_DAYS * 86400_000) throw new Error('This request has expired.');

    const status = choice === 'accept' ? 'accepted' : 'declined';
    const { data: claimed } = await db()
        .from('share_intro_requests')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', intro.id)
        .eq('status', 'pending')
        .select('id');
    if (!claimed?.length) throw new Error('You have already answered this request.');

    const { data: story } = await db().from('share_stories').select('user_id, slug, display_mode, display_name, anon_number').eq('id', intro.story_id).single();
    const memberEmail = await getUserEmail(intro.member_user_id);
    const displayName = story ? publicDisplayName(story) : 'The storyteller';

    if (choice === 'decline') {
        if (memberEmail) await sendEmail(introDeclinedEmail({ to: memberEmail, displayName }));
        return;
    }

    const experiencerEmail = story ? await getUserEmail(story.user_id) : null;
    if (!experiencerEmail || !memberEmail || !story) throw new Error('We could not complete the introduction. Please contact hello@projectprofound.org.');
    const extras: string[] = [];
    const { data: contacts } = await db().from('share_contacts').select('phone, website, other').eq('user_id', story.user_id).maybeSingle();
    if (contacts?.phone && shareExtras.phone) extras.push(`Phone: ${contacts.phone}`);
    if (contacts?.website && shareExtras.website) extras.push(`Website: ${contacts.website}`);
    if (contacts?.other && shareExtras.other) extras.push(contacts.other);

    await sendEmail(
        introAcceptedEmail({
            experiencerEmail,
            experiencerName: story.display_mode === 'named' && story.display_name ? story.display_name : 'The storyteller',
            experiencerExtras: extras,
            memberEmail,
            channelName: intro.channel_name ?? 'the channel',
            storyUrl: `${siteUrl()}/experiences/${story.slug}`,
        }),
    );
}

/** Daily maintenance: expire unanswered requests and tell the channel. */
export async function expireOldIntros(): Promise<number> {
    const cutoff = new Date(Date.now() - INTRO_TTL_DAYS * 86400_000).toISOString();
    const { data } = await db()
        .from('share_intro_requests')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('created_at', cutoff)
        .select('member_user_id, story_id');
    for (const row of data ?? []) {
        const memberEmail = await getUserEmail(row.member_user_id);
        const { data: story } = await db().from('share_stories').select('display_mode, display_name, anon_number').eq('id', row.story_id).maybeSingle();
        if (memberEmail && story) await sendEmail(introDeclinedEmail({ to: memberEmail, displayName: publicDisplayName(story) }));
    }
    return data?.length ?? 0;
}
