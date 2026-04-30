import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, suite_id, environment, app_build_id } = body
  if (!project_id || !suite_id) return NextResponse.json({ error: '参数缺失' }, { status: 400 })

  const { error } = await supabase.from('tasks').insert({
    project_id, suite_id, environment, status: 'queued',
    app_build_id: app_build_id || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
