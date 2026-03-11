// src/lib/email/resend.ts
// Resend client singleton + typed send helper.
// RESEND_API_KEY must be set in .env.local and Google Cloud Secret Manager.

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "stories@projectprofound.org";
export const EMAIL_REPLY_TO = "hello@projectprofound.org";
