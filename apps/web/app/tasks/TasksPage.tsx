import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'

type TaskRow = {
  id: string; status: string; environment: string; created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
  executors: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const locale = await getLocale()
  const t = await getDictionary()
  const supabase = await createClient()
  let query = supabase.from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name), executors(name)')
    .order('created_at', { ascending: false }).limit(50)
  if (status) query = query.eq('status', status)
  const { data: tasks } = await query

  const filters = [
    { label: t.filters.all, value: '' },
    { label: t.filters.queued, value: 'queued' },
    { label: t.filters.running, value: 'running' },
    { label: t.filters.succeeded, value: 'succeeded' },
    { label: t.filters.failed, value: 'failed' },
    { label: t.filters.timeout, value: 'timeout' },
  ]

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.pages.tasks.title}</h1>
          <p className="page-subtitle">{t.pages.tasks.subtitle}</p>
        </div>
        <Link href="/tasks/new"
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.pages.tasks.newAction}
        </Link>
      </div>

      <div className="flex gap-2">
        {filters.map(f => {
          const active = status === f.value || (!status && !f.value)
          return (
            <Link key={f.value}
              href={f.value ? `/tasks?status=${f.value}` : '/tasks'}
              className={`chip-action px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'is-active' : ''}`}
            >{f.label}</Link>
          )
        })}
      </div>

      <div className="data-panel rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t.common.project, t.common.suite, t.common.environment, t.common.status, t.common.executor, t.common.time, t.common.actions].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!tasks?.length ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t.pages.tasks.empty}</td></tr>
            ) : (tasks as TaskRow[]).map((task) => {
              const statusLabel = t.status[task.status as keyof typeof t.status] ?? task.status
              return (
                <tr key={task.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{relationName(task.projects) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{relationName(task.test_suites) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{task.environment}</td>
                  <td className="px-5 py-3">
                    <span className={`status-badge status-${task.status} px-2 py-0.5`}>{statusLabel}</span>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{relationName(task.executors) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{formatDateTime(task.created_at, locale)}</td>
                  <td className="px-5 py-3">
                    <Link href={`/tasks/${task.id}`} className="link-action text-sm">{t.common.detailsArrow}</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
