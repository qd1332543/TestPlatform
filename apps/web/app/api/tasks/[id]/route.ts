import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roles'

async function fireWebhook(url: string, payload: Record<string, unknown>) {
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // webhook failure must not block the main flow
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole('operator')
  if (!access.ok) return access.response

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const supabase = createAdminClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('id, display_id, status, suite_id, test_suites(name, suite_key), projects(name, key)')
    .eq('id', id)
    .single()
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const { error } = await supabase.from('tasks').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const newStatus = body.status as string | undefined
  if (newStatus === 'failed' || newStatus === 'succeeded' || newStatus === 'completed') {
    // Platform-level notification: use any user's preferences that has a webhook configured
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('webhook_url, notify_on_failure, notify_on_recovery')
      .neq('webhook_url', '')
      .limit(1)
      .maybeSingle()

    if (prefs?.webhook_url) {
      if (newStatus === 'failed' && prefs.notify_on_failure) {
        await fireWebhook(prefs.webhook_url, {
          event: 'task.failed',
          task_ref: task.display_id,
          suite: Array.isArray(task.test_suites) ? task.test_suites[0] : task.test_suites,
          project: Array.isArray(task.projects) ? task.projects[0] : task.projects,
        })
      }

      if ((newStatus === 'succeeded' || newStatus === 'completed') && prefs.notify_on_recovery) {
        const { data: prevTask } = await supabase
          .from('tasks')
          .select('status')
          .eq('suite_id', task.suite_id)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (prevTask?.status === 'failed') {
          await fireWebhook(prefs.webhook_url, {
            event: 'task.recovered',
            task_ref: task.display_id,
            suite: Array.isArray(task.test_suites) ? task.test_suites[0] : task.test_suites,
            project: Array.isArray(task.projects) ? task.projects[0] : task.projects,
          })
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
