// src/lib/email/resend.ts
// Resend client singleton + typed send helper.
// RESEND_API_KEY must be set in .env.local and Google Cloud Secret Manager.

import { Resend } from "resend";
import { logQuota } from "@/lib/ai/usage-tracker";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

const rawResend = new Resend(process.env.RESEND_API_KEY);

/**
 * Wrap the singleton so every `resend.emails.send(...)` records one quota row
 * for the cost dashboard — one instrumentation point covers all call sites.
 * Logging is fire-and-forget and never alters the send result.
 */
export const resend = new Proxy(rawResend, {
  get(target, prop, receiver) {
    if (prop === "emails") {
      const emails = Reflect.get(target, prop, receiver) as typeof rawResend.emails;
      return new Proxy(emails, {
        get(eTarget, eProp, eReceiver) {
          if (eProp === "send") {
            return async (...args: Parameters<typeof emails.send>) => {
              const res = await emails.send(...args);
              void logQuota({
                provider: "resend",
                operation: "email.send",
                quantity: 1,
                status: res?.error ? "error" : "success",
              });
              return res;
            };
          }
          return Reflect.get(eTarget, eProp, eReceiver);
        },
      });
    }
    return Reflect.get(target, prop, receiver);
  },
});

export const EMAIL_FROM = process.env.RESEND_FROM ?? "Project Profound <noreply@mail.projectprofound.org>";
export const EMAIL_REPLY_TO = "hello@projectprofound.org";
