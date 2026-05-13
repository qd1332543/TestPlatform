import { NextRequest, NextResponse } from 'next/server'
import yaml from 'js-yaml'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'

type SuiteEntry = { id?: string; key?: string; suite_key?: string; name?: string; type?: string; command?: string }
type Contract = { suites?: SuiteEntry[] }

export async function POST(req: NextRequest) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const t = await getDictionary()
  const supabase = createAdminClient()
  const { project_id, project_key, yml } = await req.json()
  if ((!project_id && !project_key) || !yml) return NextResponse.json({ error: t.api.missingParameters }, { status: 400 })

  let projectId = String(project_id ?? '').trim()
  if (!projectId && project_key) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('key', String(project_key).trim())
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    projectId = project?.id ?? ''
  }
  if (!projectId) return NextResponse.json({ error: t.api.projectNotFound }, { status: 400 })

  let contract: Contract
  try {
    contract = yaml.load(yml) as Contract
  } catch {
    return NextResponse.json({ error: t.api.yamlParseFailed }, { status: 400 })
  }

  const suites = contract?.suites
  if (!Array.isArray(suites) || !suites.length)
    return NextResponse.json({ error: t.api.suitesMissing }, { status: 400 })

  const rows = suites.map((s: SuiteEntry) => ({
    project_id: projectId,
    suite_key: s.id ?? s.key ?? s.suite_key,
    name: s.name ?? s.id ?? s.key,
    type: s.type ?? 'api',
    command: s.command ?? '',
  }))

  const { error } = await supabase.from('test_suites').upsert(rows, {
    onConflict: 'project_id,suite_key',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length })
}
