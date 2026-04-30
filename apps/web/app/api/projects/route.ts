import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { key, name, repo_url, description } = body
  if (!key || !name) return NextResponse.json({ error: '项目名称和标识必填' }, { status: 400 })

  const { error } = await supabase.from('projects').insert({ key, name, repo_url, description })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
