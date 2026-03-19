import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // May be set: 'recovery', 'signup', 'magiclink'
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // Always redirect to the canonical production URL, not the request origin.
  // This prevents users from being stranded on staging if the OAuth callback
  // lands on the wrong host.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // ── Detect password recovery ──────────────────────────────────────────
      // Method 1: Supabase may include `type=recovery` in the redirect
      // Method 2: Check if user.recovery_sent_at is recent (within 10 min)
      let isRecovery = type === 'recovery'

      if (!isRecovery && data.session?.user?.recovery_sent_at) {
        const recoverySentAt = new Date(data.session.user.recovery_sent_at).getTime()
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000
        isRecovery = recoverySentAt > tenMinutesAgo
      }

      if (isRecovery) {
        return NextResponse.redirect(`${siteUrl}/update-password`)
      }
      // ─────────────────────────────────────────────────────────────────────

      const redirectUrl = new URL(`${siteUrl}${next}`);
      redirectUrl.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectUrl.toString());
    }
    // Log the exact error so it appears in Firebase logs for diagnosis
    console.error('[AUTH CALLBACK ERROR] exchangeCodeForSession failed:', error.message, error);
  } else {
    console.error('[AUTH CALLBACK ERROR] No code param present in callback URL');
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}
