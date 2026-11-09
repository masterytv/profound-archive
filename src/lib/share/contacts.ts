/**
 * Channels & Contacts: the admin CRM for YouTube channels.
 *
 * Every channel already on PP (NDE `channels` via get_channel_stats, and
 * visible `uap_channels`) is listed with its live video count. Contact details
 * and outreach status live in `channel_contacts` (one row per channel,
 * created on first edit, by hand, or by CSV import). Admin only.
 */
import { z } from 'zod';
import { shareAdmin } from './db';
import { normalizeChannelRef } from './channels';

const db = () => shareAdmin();

export const CHANNEL_TYPES = ['nde', 'uap', 'both', 'other'] as const;
export const CONTACT_ROLES = ['host', 'producer', 'agency', 'network', 'other'] as const;
export const OUTREACH_STATUSES = ['not_contacted', 'contacted', 'interested', 'declined', 'member'] as const;

export interface ChannelRow {
    channelId: string;
    channelName: string;
    channelUrl: string | null;
    channelType: (typeof CHANNEL_TYPES)[number];
    /** Videos of this channel on PP (NDE + UAP). */
    ppVideos: number;
    subscribers: number;
    onPP: boolean;
    contact: {
        contactName: string;
        contactRole: (typeof CONTACT_ROLES)[number] | '';
        email: string;
        phone: string;
        contactFormUrl: string;
        website: string;
        social: string;
        outreachStatus: (typeof OUTREACH_STATUSES)[number];
        notes: string;
    } | null;
    /** Emails of people with active directory access for this channel. */
    members: string[];
}

type Contact = NonNullable<ChannelRow['contact']>;

export function youtubeUrlFor(channelId: string): string {
    return channelId.startsWith('@') ? `https://www.youtube.com/${channelId}` : `https://www.youtube.com/channel/${channelId}`;
}

/** Gmail compose link with the address in "To". */
export function gmailComposeUrl(email: string, subject = ''): string {
    const params = new URLSearchParams({ view: 'cm', fs: '1', to: email });
    if (subject) params.set('su', subject);
    return `https://mail.google.com/mail/?${params.toString()}`;
}

export async function listChannelRows(): Promise<{ rows: ChannelRow[]; tableMissing: boolean }> {
    const [nde, uap, contactsRes, membersRes] = await Promise.all([
        db().rpc('get_channel_stats'),
        // Same source as the public /uap/channels page. (uap_channels.video_count is not kept up to date.)
        db().rpc('get_uap_channel_stats'),
        db().from('channel_contacts').select('*'),
        db().from('share_channel_members').select('user_id, channel_id, channel_name').is('revoked_at', null),
    ]);

    const map = new Map<string, ChannelRow>();
    const blank = (id: string, name: string): ChannelRow => ({
        channelId: id,
        channelName: name,
        channelUrl: youtubeUrlFor(id),
        channelType: 'other',
        ppVideos: 0,
        subscribers: 0,
        onPP: false,
        contact: null,
        members: [],
    });

    for (const c of (nde.data ?? []) as Array<{ channel_id: string; channel_name: string; channel_url: string | null; video_count: number | null; subscriber_count: number | null }>) {
        const r = map.get(c.channel_id) ?? blank(c.channel_id, c.channel_name);
        r.channelType = 'nde';
        r.ppVideos += Number(c.video_count ?? 0);
        r.subscribers = Math.max(r.subscribers, Number(c.subscriber_count ?? 0));
        r.channelUrl = c.channel_url || r.channelUrl;
        r.onPP = true;
        map.set(c.channel_id, r);
    }
    for (const c of (uap.data ?? []) as Array<{ channel_id: string; channel_name: string; video_count: number | null; subscriber_count: number | null }>) {
        const r = map.get(c.channel_id) ?? blank(c.channel_id, c.channel_name);
        r.channelType = r.channelType === 'nde' ? 'both' : 'uap';
        r.ppVideos += Number(c.video_count ?? 0);
        r.subscribers = Math.max(r.subscribers, Number(c.subscriber_count ?? 0));
        r.onPP = true;
        map.set(c.channel_id, r);
    }
    // Hidden NDE channels (removed from the site) are not managed here.
    const ids = [...map.keys()];
    if (ids.length) {
        const { data: hidden } = await db().from('channels').select('channel_id').in('channel_id', ids).eq('hidden', true);
        for (const h of hidden ?? []) map.delete(h.channel_id as string);
    }

    const tableMissing = Boolean(contactsRes.error);
    for (const c of (contactsRes.data ?? []) as Array<Record<string, string | null>>) {
        const id = c.channel_id as string;
        const r = map.get(id) ?? blank(id, c.channel_name ?? id);
        r.channelName = r.onPP ? r.channelName : c.channel_name ?? id;
        if (c.channel_url) r.channelUrl = c.channel_url;
        if (!r.onPP && c.channel_type) r.channelType = c.channel_type as ChannelRow['channelType'];
        r.contact = {
            contactName: c.contact_name ?? '',
            contactRole: (c.contact_role ?? '') as Contact['contactRole'],
            email: c.email ?? '',
            phone: c.phone ?? '',
            contactFormUrl: c.contact_form_url ?? '',
            website: c.website ?? '',
            social: c.social ?? '',
            outreachStatus: (c.outreach_status ?? 'not_contacted') as Contact['outreachStatus'],
            notes: c.notes ?? '',
        };
        map.set(id, r);
    }

    const members = (membersRes.data ?? []) as Array<{ user_id: string; channel_id: string; channel_name: string | null }>;
    if (members.length) {
        const emails = new Map<string, string>();
        await Promise.all(
            [...new Set(members.map((m) => m.user_id))].map(async (uid) => {
                const { data } = await db().auth.admin.getUserById(uid);
                if (data.user?.email) emails.set(uid, data.user.email);
            }),
        );
        for (const m of members) {
            const r = map.get(m.channel_id) ?? blank(m.channel_id, m.channel_name ?? m.channel_id);
            r.members.push(emails.get(m.user_id) ?? m.user_id);
            map.set(m.channel_id, r);
        }
    }

    const rows = [...map.values()].sort((a, b) => b.ppVideos - a.ppVideos || a.channelName.localeCompare(b.channelName));
    return { rows, tableMissing };
}

// ─── Editing ───────────────────────────────────────────────────────────────

const opt = (max: number) => z.string().trim().max(max).optional().default('').transform((v) => v || null);

export const contactSchema = z.object({
    channel_id: z.string().trim().min(2).max(64),
    channel_name: z.string().trim().min(1).max(200),
    channel_url: opt(300),
    channel_type: z.enum(CHANNEL_TYPES).default('other'),
    contact_name: opt(200),
    contact_role: z.enum(CONTACT_ROLES).optional().nullable().or(z.literal('').transform(() => null)),
    email: z
        .string()
        .trim()
        .max(300)
        .optional()
        .default('')
        .refine((v) => !v || v.split(/[;,]\s*/).every((e) => z.string().email().safeParse(e).success), 'Please enter a valid email address.')
        .transform((v) => v || null),
    phone: opt(60),
    contact_form_url: opt(300),
    website: opt(300),
    social: opt(500),
    outreach_status: z.enum(OUTREACH_STATUSES).default('not_contacted'),
    notes: opt(4000),
});

export async function saveContact(raw: z.input<typeof contactSchema>) {
    const v = contactSchema.parse(raw);
    const { error } = await db().from('channel_contacts').upsert(v, { onConflict: 'channel_id' });
    if (error) throw new Error(error.message);
}

/** Add a channel that isn't on PP, from a link / @handle / channel ID. */
export async function addChannel(name: string, ref: string, type: (typeof CHANNEL_TYPES)[number]) {
    const id = normalizeChannelRef(ref);
    if (!id) throw new Error('That doesn’t look like a YouTube channel link, @handle or channel ID.');
    const { data: existing } = await db().from('channel_contacts').select('id').eq('channel_id', id).maybeSingle();
    if (existing) throw new Error('That channel is already in the list.');
    await saveContact({ channel_id: id, channel_name: name, channel_url: youtubeUrlFor(id), channel_type: type });
    return id;
}

export async function deleteContact(channelId: string) {
    const { error } = await db().from('channel_contacts').delete().eq('channel_id', channelId);
    if (error) throw new Error(error.message);
}

// ─── CSV import ────────────────────────────────────────────────────────────

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): Record<string, string>[] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    const src = text.replace(/^﻿/, '');
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"' && src[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && src[i + 1] === '\n') i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else field += ch;
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
    if (!header) return [];
    const keys = header.map((h) => h.trim().toLowerCase());
    return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const ROLE_HINTS: Array<[RegExp, (typeof CONTACT_ROLES)[number]]> = [
    [/agency|agent|wme|lighthouse/i, 'agency'],
    [/network/i, 'network'],
    [/producer/i, 'producer'],
];

/**
 * Map one CSV row to a contact. Understands the columns of the channel contact
 * list compiled on 2026-11-09 (channel_name, vertical, youtube_url, host_name,
 * email, contact_form_url, website, other_handles, notes) and the same names as
 * this table (contact_name, channel_type, phone, social…).
 */
export function csvRowToContact(r: Record<string, string>): z.input<typeof contactSchema> | null {
    const id = normalizeChannelRef(r.channel_id || r.youtube_url || r.channel_url || '');
    const name = r.channel_name || r.name;
    if (!id || !name) return null;
    const vertical = (r.channel_type || r.vertical || '').toLowerCase();
    const type: (typeof CHANNEL_TYPES)[number] = vertical.includes('nde') && vertical.includes('uap') ? 'both' : vertical.includes('nde') ? 'nde' : vertical.includes('uap') ? 'uap' : 'other';
    const emails = (r.email || '').split(/[;,]\s*/).map((e) => e.trim()).filter((e) => z.string().email().safeParse(e).success);
    const notes = r.notes || '';
    const role = (r.contact_role as (typeof CONTACT_ROLES)[number]) || ROLE_HINTS.find(([re]) => re.test(notes))?.[1] || (r.host_name || r.contact_name ? 'host' : '');
    return {
        channel_id: id,
        channel_name: name.slice(0, 200),
        channel_url: (r.youtube_url || r.channel_url || '').slice(0, 300),
        channel_type: type,
        contact_name: (r.contact_name || r.host_name || '').slice(0, 200),
        contact_role: CONTACT_ROLES.includes(role as never) ? (role as (typeof CONTACT_ROLES)[number]) : '',
        email: emails.join(', ').slice(0, 300),
        phone: (r.phone || '').slice(0, 60),
        contact_form_url: (r.contact_form_url || '').slice(0, 300),
        website: (r.website || '').slice(0, 300),
        social: (r.social || r.other_handles || '').slice(0, 500),
        outreach_status: OUTREACH_STATUSES.includes(r.outreach_status as never) ? (r.outreach_status as (typeof OUTREACH_STATUSES)[number]) : 'not_contacted',
        notes: notes.slice(0, 4000),
    };
}

/**
 * Import contacts from CSV. Existing rows are updated only where the CSV has a
 * value and the row's field is empty, so manual edits are never overwritten.
 */
export async function importContactsCsv(text: string): Promise<{ added: number; updated: number; skipped: number }> {
    const parsed = parseCsv(text).map(csvRowToContact);
    const valid = parsed.filter((c): c is NonNullable<typeof c> => Boolean(c));
    const { data: existing } = await db().from('channel_contacts').select('*').in('channel_id', valid.map((c) => c.channel_id));
    const byId = new Map(((existing ?? []) as Array<Record<string, string | null>>).map((e) => [e.channel_id as string, e]));
    let added = 0;
    let updated = 0;
    for (const c of valid) {
        const e = byId.get(c.channel_id);
        if (!e) {
            await saveContact(c);
            added++;
            continue;
        }
        const merged: Record<string, unknown> = { ...e };
        let changed = false;
        for (const [k, v] of Object.entries(c)) {
            if (v && !e[k]) {
                merged[k] = v;
                changed = true;
            }
        }
        if (changed) {
            delete merged.id;
            delete merged.created_at;
            delete merged.updated_at;
            await saveContact(merged as z.input<typeof contactSchema>);
            updated++;
        }
    }
    return { added, updated, skipped: parsed.length - valid.length };
}
