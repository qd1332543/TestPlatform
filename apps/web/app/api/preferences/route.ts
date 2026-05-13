import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeAccountPreferences,
  preferencesFromRow,
  preferencesToRow,
  type AccountPreferences,
} from '@/lib/account/preferences'

export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_preferences')
    .select('platform_name, locale, theme, density, default_environment, ai_model, ai_base_url, auto_analyze_failures, webhook_url, notify_on_failure, notify_on_recovery')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: preferencesFromRow(data) })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json() as Partial<AccountPreferences>
  const preferences = normalizeAccountPreferences(body)
  const { error } = await supabase
    .from('user_preferences')
    .upsert(preferencesToRow(user.id, preferences), { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences })
}
