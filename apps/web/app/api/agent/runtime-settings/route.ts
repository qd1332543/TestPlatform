import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RuntimeSettingsRow = {
  executor_name: string
  enabled: boolean
  task_check_interval_seconds: number
  task_source: string
  private_preview_only: boolean
  updated_at: string
}

const runtimeSettingsFields = 'executor_name, enabled, task_check_interval_seconds, task_source, private_preview_only, updated_at'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('agent_runtime_settings')
    .select(runtimeSettingsFields)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as RuntimeSettingsRow)
}

export async function PATCH(req: Request) {
  const body = await req.json() as Partial<RuntimeSettingsRow>
  const allowed = ['task_check_interval_seconds', 'enabled', 'task_source', 'private_preview_only']
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key as keyof typeof body]
  }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('agent_runtime_settings')
    .update(patch)
    .eq('executor_name', body.executor_name ?? 'default')
    .select(runtimeSettingsFields)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as RuntimeSettingsRow)
}
