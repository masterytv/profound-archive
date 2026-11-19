// src/lib/email/audience.ts
// Project Profound's newsletter, "NDE of the Week", and its copy of its subscribers in Resend (marketing plan steps
// 3–4). Tom, 2026-11-18: email stays on Resend; 2026-11-19: one newsletter per site, each on its own system, so this
// one is Project Profound's only (Soul Wisdom's lives in the soulwisdomnetwork repo, with its own list).
// `quiz_leads` is the list of record; the Resend segment RESEND_SEGMENT_ID holds the same people, so the weekly
// email goes out as one Resend broadcast (free up to 1,000 contacts), not one email at a time against the free
// plan's 100 a day. Every call here is best-effort: a Resend failure never costs a sign-up or an unsubscribe.

// The Resend client is loaded only when the segment is set: its module refuses to load without RESEND_API_KEY,
// which must never break a sign-up or an unsubscribe.
const client = async () => (await import("@/lib/email/resend")).resend;

/** The lists that make up the newsletter. */
export const NEWSLETTER_LISTS = ["newsletter_nde", "newsletter_uap"] as const;
export type NewsletterList = (typeof NEWSLETTER_LISTS)[number];

export function isNewsletterList(list: string): list is NewsletterList {
  return (NEWSLETTER_LISTS as readonly string[]).includes(list);
}

/** The Resend segment the newsletter goes to; null leaves Resend out (local runs, or before it is set up). */
export function newsletterSegmentId(): string | null {
  return process.env.RESEND_SEGMENT_ID?.trim() || null;
}

/** Resend answers "already exists" (409, or a validation error naming it) for a contact or membership it has. */
function alreadyExists(error: { message?: string; statusCode?: number | null } | null): boolean {
  if (!error) return false;
  return error.statusCode === 409 || /already exists/i.test(error.message ?? "");
}

/**
 * Puts the person in the newsletter's segment, subscribed. Someone who unsubscribed from a broadcast and signs up
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

/** Takes the person out of the newsletter's segment. Unknown is fine. */
export async function removeFromNewsletter(email: string): Promise<void> {
  const segmentId = newsletterSegmentId();
  if (!segmentId) return;
  const resend = await client();
  const { error } = await resend.contacts.segments.remove({ email, segmentId });
  if (error && error.statusCode !== 404) throw new Error(`Resend segment remove: ${error.message}`);
}

/** The forms of an address to match in `quiz_leads`, which keeps it as typed. */
export function emailForms(email: string): string[] {
  const trimmed = email.trim();
  return [...new Set([trimmed, trimmed.toLowerCase()])];
}
