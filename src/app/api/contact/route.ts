// src/app/api/contact/route.ts
// POST /api/contact  { name, email, message }
// Forwards the message to tom@projectprofound.org via Resend.

import { NextResponse } from "next/server";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

const CONTACT_TO = "tom@projectprofound.org";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Security: escape HTML entities to prevent XSS in email HTML
    const esc = (s: string) => s.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!)
    );
    const safeName = esc(name);
    const safeEmail = esc(email);
    const safeMessage = esc(message);

    const { error } = await resend.emails.send({
      from:     EMAIL_FROM,
      to:       [CONTACT_TO],
      replyTo:  email,
      subject:  `[Project Profound] Message from ${safeName}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; color: #1E293B;">
          <h2 style="font-size: 22px; margin-bottom: 4px;">New message from the website</h2>
          <p style="color: #64748B; margin-top: 0; font-size: 14px;">via projectprofound.org/about#connect</p>
          <hr style="border-color: #E2E8F0; margin: 20px 0;" />
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <hr style="border-color: #E2E8F0; margin: 20px 0;" />
          <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.7;">${safeMessage}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
