import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'

export async function POST(req: NextRequest) {
  const access = await requireRole('operator')
  if (!access.ok) return access.response

  const supabase = createAdminClient()
  const body = await req.json()
  const { project_id, suite_id, environment, app_build_id } = body
  if (!project_id || !suite_id) return NextResponse.json({ error: '参数缺失' }, { status: 400 })

  const { data, error } = await supabase.from('tasks').insert({
    project_id,
    suite_id,
    environment,
    status: 'queued',
    app_build_id: app_build_id || null,
    created_by: access.role,
    parameters: {
      source: 'web-console',
      private_agent_preview: process.env.METEORTEST_PUBLIC_PREVIEW === '1',
    },
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task_id: data?.id })
}
