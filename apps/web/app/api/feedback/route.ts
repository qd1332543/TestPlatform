import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const categories = new Set(['general', 'bug', 'feature', 'account'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json()
  const category = String(body.category ?? 'general')
  const message = String(body.message ?? '').trim()

  if (!message) return NextResponse.json({ error: 'Feedback message is required.' }, { status: 400 })
  if (!categories.has(category)) return NextResponse.json({ error: 'Invalid feedback category.' }, { status: 400 })

  const { error } = await supabase.from('feedbacks').insert({
    user_id: user.id,
    category,
    message,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
