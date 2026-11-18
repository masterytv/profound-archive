// src/lib/email/audience.ts
// The newsletter's copy of its subscribers in Resend (marketing plan steps 3–4, Tom 2026-11-18: email stays on
// Resend, no Kit). `quiz_leads` stays the list of record; the Resend segment named by RESEND_SEGMENT_ID holds the
// same people so the weekly "NDE of the Week" goes out as one Resend broadcast (free up to 1,000 contacts), not
// one email at a time against the free plan's 100 a day. Every call here is best-effort: a Resend failure never
// costs a sign-up or an unsubscribe in PP's own table.

// The Resend client is loaded only when a segment is set: its module refuses to load without RESEND_API_KEY,
// which must never break a sign-up or an unsubscribe.
const client = async () => (await import("@/lib/email/resend")).resend;

/** The lists that make up the newsletter. newsletter_swc: sign-ups from soulwisdomcollective.com. */
export const NEWSLETTER_LISTS = ["newsletter_nde", "newsletter_uap", "newsletter_swc"] as const;
export type NewsletterList = (typeof NEWSLETTER_LISTS)[number];

export function isNewsletterList(list: string): list is NewsletterList {
  return (NEWSLETTER_LISTS as readonly string[]).includes(list);
}

/** The Resend segment the newsletter goes to; null leaves Resend out (local runs, or before it is set up). */
export function newsletterSegmentId(): string | null {
  return process.env.RESEND_SEGMENT_ID?.trim() || null;
}

/** Resend answers "already exists" (409, or a validation error naming it) for a contact it has. */
function alreadyExists(error: { name?: string; message?: string; statusCode?: number | null } | null): boolean {
  if (!error) return false;
  return error.statusCode === 409 || /already exists/i.test(error.message ?? "");
}

/**
 * Puts the person in the newsletter segment, subscribed. Someone who unsubscribed from a broadcast and signs up
 * again has asked for it, so they are subscribed again.
 */
export async function addToNewsletter(email: string): Promise<"added" | "updated" | "skipped"> {
  const segmentId = newsletterSegmentId();
  if (!segmentId) return "skipped";
  const resend = await client();
  const created = await resend.contacts.create({ email, unsubscribed: false, segments: [{ id: segmentId }] });
  if (!created.error) return "added";
  if (!alreadyExists(created.error)) throw new Error(`Resend contact: ${created.error.message}`);
  const updated = await resend.contacts.update({ email, unsubscribed: false });
  if (updated.error) throw new Error(`Resend contact update: ${updated.error.message}`);
  const added = await resend.contacts.segments.add({ email, segmentId });
  if (added.error && !alreadyExists(added.error)) throw new Error(`Resend segment: ${added.error.message}`);
  return "updated";
}

/** Marks the person unsubscribed in Resend, so no broadcast reaches them. Unknown contacts are fine. */
export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  if (!newsletterSegmentId()) return;
  const resend = await client();
  const { error } = await resend.contacts.update({ email, unsubscribed: true });
  if (error && error.statusCode !== 404) throw new Error(`Resend unsubscribe: ${error.message}`);
}

/** The forms of an address to match in `quiz_leads`, which keeps it as typed. */
export function emailForms(email: string): string[] {
  const trimmed = email.trim();
  return [...new Set([trimmed, trimmed.toLowerCase()])];
}
