import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const access = await requireRole('operator')
  if (!access.ok) return access.response

  const t = await getDictionary()
  const body = await req.json()
  const projectKey = String(body.project_key ?? '').trim()
  const platform = String(body.platform ?? '').trim()
  const version = String(body.version ?? '').trim()
  const buildNumber = String(body.build_number ?? '').trim()
  const artifactUrl = String(body.artifact_url ?? '').trim()
  const bundleId = String(body.bundle_id ?? '').trim()
  const packageName = String(body.package_name ?? '').trim()
  const gitCommit = String(body.git_commit ?? '').trim()

  if (!projectKey || !platform || !version || !artifactUrl) {
    return NextResponse.json({ error: t.api.missingParameters }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('key', projectKey)
    .maybeSingle()
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
  if (!project?.id) return NextResponse.json({ error: t.api.projectNotFound }, { status: 400 })

  const { data: displayId } = await supabase.rpc('next_display_id', { prefix: 'BLD', table_name: 'app_builds' })
  const { data, error } = await supabase
    .from('app_builds')
    .insert({
      display_id: displayId,
      project_id: project.id,
      platform,
      version,
      build_number: buildNumber || null,
      artifact_url: artifactUrl,
      bundle_id: bundleId || null,
      package_name: packageName || null,
      git_commit: gitCommit || null,
    })
    .select('display_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, build_ref: data.display_id })
}
