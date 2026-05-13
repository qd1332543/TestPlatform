import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'
import { isUuid } from '@/lib/viewModels/displayRefs'

function serviceClient() {
  return createAdminClient()
}

function publicPreviewResponse(message: string) {
  if (process.env.METEORTEST_PUBLIC_PREVIEW !== '1') return null
  return NextResponse.json({ error: message }, { status: 403 })
}

async function resolveProjectId(ref: string) {
  if (isUuid(ref)) return ref
  const { data, error } = await serviceClient()
    .from('projects')
    .select('id')
    .eq('key', ref)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? ''
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const t = await getDictionary()
  const preview = publicPreviewResponse(t.api.previewManagementDisabled)
  if (preview) return preview

  const { id } = await params
  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const repo_url = String(body.repo_url ?? '').trim()
  const description = String(body.description ?? '').trim()

  if (!id) return NextResponse.json({ error: t.api.projectRefRequired }, { status: 400 })
  if (!name) return NextResponse.json({ error: t.api.projectNameRequired }, { status: 400 })

  const projectId = await resolveProjectId(id)
  if (!projectId) return NextResponse.json({ error: t.api.projectNotFound }, { status: 404 })

  const { error } = await serviceClient()
    .from('projects')
    .update({ name, repo_url, description })
    .eq('id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const t = await getDictionary()
  const preview = publicPreviewResponse(t.api.previewManagementDisabled)
  if (preview) return preview

  const { id } = await params
  if (!id) return NextResponse.json({ error: t.api.projectRefRequired }, { status: 400 })

  const supabase = serviceClient()
  const projectId = await resolveProjectId(id)
  if (!projectId) return NextResponse.json({ error: t.api.projectNotFound }, { status: 404 })

  const { error: taskError } = await supabase.from('tasks').delete().eq('project_id', projectId)
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })

  const { error: projectError } = await supabase.from('projects').delete().eq('id', projectId)
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
