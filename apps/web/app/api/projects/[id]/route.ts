import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'

function serviceClient() {
  return createAdminClient()
}

function publicPreviewResponse() {
  if (process.env.METEORTEST_PUBLIC_PREVIEW !== '1') return null
  return NextResponse.json({ error: 'Project management actions are disabled in public preview mode.' }, { status: 403 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const preview = publicPreviewResponse()
  if (preview) return preview

  const { id } = await params
  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const repo_url = String(body.repo_url ?? '').trim()
  const description = String(body.description ?? '').trim()

  if (!id) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })

  const { error } = await serviceClient()
    .from('projects')
    .update({ name, repo_url, description })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole('admin')
  if (!access.ok) return access.response

  const preview = publicPreviewResponse()
  if (preview) return preview

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 })

  const supabase = serviceClient()
  const { error: taskError } = await supabase.from('tasks').delete().eq('project_id', id)
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })

  const { error: projectError } = await supabase.from('projects').delete().eq('id', id)
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
