import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'

export async function POST(req: NextRequest) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const supabase = createAdminClient()
  const body = await req.json()
  const { key, name, repo_url, description } = body
  if (!key || !name) return NextResponse.json({ error: '项目名称和标识必填' }, { status: 400 })

  const { error } = await supabase.from('projects').insert({ key, name, repo_url, description })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
