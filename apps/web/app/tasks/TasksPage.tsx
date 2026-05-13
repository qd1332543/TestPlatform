import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { demoTasks, isLocalDemo } from '@/lib/localDemo'
import { taskRef } from '@/lib/viewModels/displayRefs'

type TaskRow = {
  id: string; display_id?: string | null; status: string; environment: string; created_at: string
  parameters?: { display_name?: string } | null
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
  const supabase = isLocalDemo() ? null : await createClient()
  const { data: tasks } = supabase
    ? await (() => {
      let query = supabase.from('tasks')
        .select('id, display_id, status, environment, parameters, created_at, projects(name), test_suites(name), executors(name)')
        .order('created_at', { ascending: false }).limit(50)
      if (status) query = query.eq('status', status)
      return query
    })()
    : { data: status ? demoTasks.filter(task => task.status === status) : demoTasks }
  const taskRows = (tasks ?? []) as TaskRow[]
  const statusCounts = {
    queued: taskRows.filter(task => task.status === 'queued').length,
    running: taskRows.filter(task => task.status === 'running').length,
    succeeded: taskRows.filter(task => task.status === 'succeeded').length,
    failed: taskRows.filter(task => task.status === 'failed' || task.status === 'timeout').length,
  }
  const hasQueueRisk = statusCounts.failed > 0 || statusCounts.queued > 3

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
      <div className="console-hero rounded-xl p-5 page-header">
        <div>
          <h1 className="page-title">{t.pages.tasks.title}</h1>
          <p className="page-subtitle">{t.pages.tasks.subtitle}</p>
        </div>
        <Link href="/tasks/new"
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.pages.tasks.newAction}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t.status.queued, value: statusCounts.queued, className: 'status-queued' },
          { label: t.status.running, value: statusCounts.running, className: 'status-running' },
          { label: t.status.succeeded, value: statusCounts.succeeded, className: 'status-succeeded' },
          { label: t.status.failed, value: statusCounts.failed, className: 'status-failed' },
        ].map(item => (
          <div key={item.label} className="metric-card rounded-xl p-4">
            <div className={`status-badge ${item.className} px-2 py-0.5`}>{item.label}</div>
            <div className="metric-value mt-3">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
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

      <div className="data-panel rounded-xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="section-title">{t.pages.tasks.queueHealth}</div>
            <div className="section-subtitle">{hasQueueRisk ? t.pages.tasks.queueHealthRisk : t.pages.tasks.queueHealthGood}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: t.status.queued, value: statusCounts.queued, className: 'status-queued' },
              { label: t.status.running, value: statusCounts.running, className: 'status-running' },
              { label: t.status.failed, value: statusCounts.failed, className: 'status-failed' },
              { label: t.status.succeeded, value: statusCounts.succeeded, className: 'status-succeeded' },
            ].map(item => (
              <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: 'var(--surface-faint)', border: '1px solid var(--border)' }}>
                <div className={`status-badge ${item.className} px-2 py-0.5`}>{item.label}</div>
                <div className="mt-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">{t.pages.tasks.queueTitle}</div>
          <div className="section-subtitle">{t.pages.tasks.queueSubtitle}</div>
        </div>
        <div className="desktop-table overflow-x-auto">
        <table className="console-table">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t.common.project, t.common.suite, t.common.environment, t.common.status, t.common.executor, t.common.time, t.common.actions].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!taskRows.length ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t.pages.tasks.empty}</td></tr>
            ) : taskRows.map((task) => {
              const statusLabel = t.status[task.status as keyof typeof t.status] ?? task.status
              const ref = taskRef(task)
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
                    <Link href={`/tasks/${ref}`} className="link-action text-sm">{t.common.detailsArrow}</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <div className="mobile-card-list p-3">
          {!taskRows.length ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.tasks.empty}</div>
          ) : taskRows.map((task) => {
            const statusLabel = t.status[task.status as keyof typeof t.status] ?? task.status
            const ref = taskRef(task)
            return (
              <Link key={task.id} href={`/tasks/${ref}`} className="rounded-xl p-4" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{relationName(task.projects) ?? '-'}</div>
                    <div className="mt-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{relationName(task.test_suites) ?? '-'}</div>
                  </div>
                  <span className={`status-badge status-${task.status} shrink-0 px-2 py-0.5`}>{statusLabel}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>{t.common.environment}: {task.environment}</span>
                  <span>{t.common.executor}: {relationName(task.executors) ?? '-'}</span>
                  <span className="sm:col-span-2">{formatDateTime(task.created_at, locale)}</span>
                </div>
                <div className="mt-3 link-action text-sm">{t.pages.tasks.mobileOpen}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
