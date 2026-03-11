// src/app/api/email/unsubscribe/route.ts
// GET /api/email/unsubscribe?token=<unsubscribe_token>
// Redirects to the smart unsubscribe management page.
// The actual save happens when the user confirms on that page.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=missing", req.url));
  }

  // Redirect to the UI page — page will load subs and let user manage per-list
  return NextResponse.redirect(
    new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, req.url)
  );
}
