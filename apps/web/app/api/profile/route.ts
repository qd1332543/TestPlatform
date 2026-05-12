import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json()
  const displayName = String(body.display_name ?? '').trim()
  const avatarUrl = String(body.avatar_url ?? '').trim()

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
