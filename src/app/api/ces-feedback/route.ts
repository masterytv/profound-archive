import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  try {
    const body = await req.json()
    const { score, path, session_id, user_id } = body

    if (typeof score !== 'number' || score < 1 || score > 7) {
      return NextResponse.json({ error: 'score must be an integer between 1 and 7' }, { status: 400 })
    }

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('ces_feedback')
      .insert({
        score: Math.round(score),
        path: typeof path === 'string' ? path.slice(0, 500) : null,
        session_id,
        user_id: user_id ?? null,
        phase: 'score_only',
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
  try {
    const body = await req.json()
    const { session_id, reason } = body

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    if (reason !== null && reason !== undefined && typeof reason !== 'string') {
      return NextResponse.json({ error: 'reason must be a string or null' }, { status: 400 })
    }

    if (typeof reason === 'string' && reason.length > 500) {
      return NextResponse.json({ error: 'reason must be 500 characters or fewer' }, { status: 400 })
    }

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
