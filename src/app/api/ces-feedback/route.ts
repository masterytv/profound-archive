import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

// Throttle (S-11): unauthenticated service-role writes — bound junk-data spam.
// One bucket for POST+PATCH; a normal interaction is one of each.
const RATE_LIMIT = { name: 'ces-feedback', windowMs: 60_000, max: 10 }

// Request shapes (S-12).
const PostSchema = z.object({
  score: z.number().min(0).max(7),
  session_id: z.string().min(1).max(200),
  user_id: z.string().max(200).nullish(),
  path: z.string().max(500).nullish(),
  source: z.string().max(100).nullish(),
  feature: z.string().max(100).nullish(),
  context_id: z.string().max(200).nullish(),
})

const PatchSchema = z.object({
  session_id: z.string().min(1).max(200),
  reason: z.string().max(500).nullish(),
})

// CES Feedback API — POST to insert score, PATCH to add reason.
// Uses service client for writes from this server-side API route.
// This is safe: the service key is only accessible server-side and
// never returned to the browser. The anon key cannot satisfy RLS
// for unauthenticated inserts on this project configuration.

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMIT)
  if (limited) return limited

  try {
    const parsed = PostSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { score, path, session_id, user_id, source, feature, context_id } = parsed.data

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('ces_feedback')
      .insert({
        score: Math.round(score),
        path: path ?? null,
        session_id,
        user_id: user_id ?? null,
        phase: 'score_only',
        source: source ?? 'ces_widget',
        feature: feature ?? null,
        context_id: context_id ?? null,
      })
      .select('id, session_id')
      .single()

    if (error) {
      console.error('[CES API] INSERT error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id, session_id: data.session_id })
  } catch (err) {
    console.error('[CES API] POST unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMIT)
  if (limited) return limited

  try {
    const parsed = PatchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { session_id, reason } = parsed.data

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('ces_feedback')
      .update({
        reason: reason ? reason.trim() : null,
        phase: 'complete',
      })
      .eq('session_id', session_id)

    if (error) {
      console.error('[CES API] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[CES API] PATCH unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
