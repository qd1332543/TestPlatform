import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'

export async function POST(req: NextRequest) {
  const access = await requireRole('operator')
  if (!access.ok) return access.response

  const t = await getDictionary()
  const supabase = createAdminClient()
  const body = await req.json()
  const {
    project_id,
    suite_id,
    app_build_id,
    project_key,
    suite_key,
    app_build_ref,
    environment,
  } = body

  let resolvedProjectId = String(project_id ?? '').trim()
  if (!resolvedProjectId && project_key) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('key', String(project_key).trim())
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    resolvedProjectId = project?.id ?? ''
  }
  if (!resolvedProjectId) return NextResponse.json({ error: t.api.projectRefRequired }, { status: 400 })

  let resolvedSuiteId = String(suite_id ?? '').trim()
  if (!resolvedSuiteId && suite_key) {
    const { data: suite, error } = await supabase
      .from('test_suites')
      .select('id')
      .eq('project_id', resolvedProjectId)
      .eq('suite_key', String(suite_key).trim())
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    resolvedSuiteId = suite?.id ?? ''
  }
  if (!resolvedSuiteId) return NextResponse.json({ error: t.api.suiteNotFound }, { status: 400 })

  let resolvedBuildId = String(app_build_id ?? '').trim()
  if (!resolvedBuildId && app_build_ref) {
    const { data: build, error } = await supabase
      .from('app_builds')
      .select('id')
      .eq('project_id', resolvedProjectId)
      .eq('display_id', String(app_build_ref).trim())
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    resolvedBuildId = build?.id ?? ''
    if (!resolvedBuildId) return NextResponse.json({ error: t.api.buildNotFound }, { status: 400 })
  }

  const { data: displayId } = await supabase.rpc('next_display_id', { prefix: 'MT', table_name: 'tasks' })

  const { data, error } = await supabase.from('tasks').insert({
    display_id: displayId,
    project_id: resolvedProjectId,
    suite_id: resolvedSuiteId,
    environment,
    status: 'queued',
    app_build_id: resolvedBuildId || null,
    created_by: access.role,
    parameters: {
      source: 'web-console',
      private_agent_preview: process.env.METEORTEST_PUBLIC_PREVIEW === '1',
    },
  }).select('display_id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task_ref: data?.display_id })
}
