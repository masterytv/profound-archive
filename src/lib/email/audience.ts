// src/lib/email/audience.ts
// The newsletters' copies of their subscribers in Resend (marketing plan steps 3–4). Tom, 2026-11-18: email stays on
// Resend, no Kit; 2026-11-19: two weekly emails, one per site. `quiz_leads` stays the list of record; each newsletter
// has a Resend segment holding the same people, so its weekly email goes out as one Resend broadcast (free up to
// 1,000 contacts), not one email at a time against the free plan's 100 a day:
//   - "pp":  Project Profound's "NDE of the Week", to newsletter_nde and newsletter_uap (RESEND_SEGMENT_ID);
//   - "swc": "Soul Wisdom Video of the Week", to newsletter_swc, the sign-ups from soulwisdomcollective.com
//            (RESEND_SWC_SEGMENT_ID).
// Every call here is best-effort: a Resend failure never costs a sign-up or an unsubscribe in PP's own table.

// The Resend client is loaded only when a segment is set: its module refuses to load without RESEND_API_KEY,
// which must never break a sign-up or an unsubscribe.
const client = async () => (await import("@/lib/email/resend")).resend;

export type Newsletter = "pp" | "swc";
export const NEWSLETTERS: Newsletter[] = ["pp", "swc"];

/** Which newsletter each list belongs to. newsletter_swc: sign-ups from soulwisdomcollective.com. */
export const NEWSLETTER_OF = {
  newsletter_nde: "pp",
  newsletter_uap: "pp",
  newsletter_swc: "swc",
} as const satisfies Record<string, Newsletter>;
export type NewsletterList = keyof typeof NEWSLETTER_OF;
export const NEWSLETTER_LISTS = Object.keys(NEWSLETTER_OF) as NewsletterList[];

export function isNewsletterList(list: string): list is NewsletterList {
  return list in NEWSLETTER_OF;
}

/** The lists whose subscribers get one newsletter. */
export function listsOf(newsletter: Newsletter): NewsletterList[] {
  return NEWSLETTER_LISTS.filter((l) => NEWSLETTER_OF[l] === newsletter);
}

/** The Resend segment a newsletter goes to; null leaves Resend out for it (local runs, or before it is set up). */
export function segmentIdOf(newsletter: Newsletter): string | null {
  const v = newsletter === "pp" ? process.env.RESEND_SEGMENT_ID : process.env.RESEND_SWC_SEGMENT_ID;
  return v?.trim() || null;
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
export async function addToNewsletter(email: string, newsletter: Newsletter): Promise<"added" | "updated" | "skipped"> {
  const segmentId = segmentIdOf(newsletter);
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

/** Takes the person out of one newsletter's segment; their other newsletter is left alone. Unknown is fine. */
export async function removeFromNewsletter(email: string, newsletter: Newsletter): Promise<void> {
  const segmentId = segmentIdOf(newsletter);
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
