import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'

type RecentTaskRow = {
  id: string; status: string; environment: string; created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  queued:    { bg: '#1a2438', color: '#64748B' },
  running:   { bg: '#0D1F3C', color: '#3B82F6' },
  succeeded: { bg: '#0D2818', color: '#22C55E' },
  failed:    { bg: '#2A0F0F', color: '#EF4444' },
  cancelled: { bg: '#1a2438', color: '#475569' },
  timeout:   { bg: '#2A1A0A', color: '#F97316' },
}

export default async function Dashboard() {
  const locale = await getLocale()
  const copy = await getDictionary()
  const supabase = await createClient()
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const { data: tasks } = await supabase
    .from('tasks').select('id, status, started_at, finished_at')
    .gte('created_at', today.toISOString()).order('created_at', { ascending: false })

  const total = tasks?.length ?? 0
  const succeeded = tasks?.filter(t => t.status === 'succeeded').length ?? 0
  const failed = tasks?.filter(t => t.status === 'failed').length ?? 0
  const running = tasks?.filter(t => t.status === 'running').length ?? 0
  const queued = tasks?.filter(t => t.status === 'queued').length ?? 0
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) + '%' : '-'
  const durations = tasks?.filter(t => t.started_at && t.finished_at)
    .map(t => new Date(t.finished_at).getTime() - new Date(t.started_at).getTime())
  const avgDuration = durations?.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000) + 's' : '-'

  const { data: recentTasks } = await supabase
    .from('tasks').select('id, status, environment, created_at, projects(name), test_suites(name)')
    .order('created_at', { ascending: false }).limit(10)

  const stats = [
    { label: copy.dashboard.stats.todayTasks, value: String(total), icon: '01', color: 'var(--accent)' },
    { label: copy.dashboard.stats.successRate, value: successRate, icon: '02', color: '#22C55E' },
    { label: copy.dashboard.stats.failedTasks, value: String(failed), icon: '03', color: failed > 0 ? '#EF4444' : 'var(--text-muted)' },
    { label: copy.dashboard.stats.avgDuration, value: avgDuration, icon: '04', color: 'var(--accent-2)' },
  ]

  return (
    <div className="page-shell space-y-6">
      <section className="console-hero rounded-xl p-6 overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div>
              <div className="kicker mb-2">{copy.dashboard.kicker}</div>
              <h1 className="text-3xl font-bold text-white">{copy.dashboard.title}</h1>
              <p className="text-sm mt-2 max-w-2xl leading-6" style={{ color: 'var(--text-secondary)' }}>
                {copy.dashboard.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/ai" className="primary-action px-4 py-2.5 rounded-lg text-sm font-semibold">{copy.dashboard.openAi}</Link>
              <Link href="/tasks/new" className="secondary-action px-4 py-2.5 rounded-lg text-sm">{copy.dashboard.newTask}</Link>
              <Link href="/executors" className="secondary-action px-4 py-2.5 rounded-lg text-sm">{copy.dashboard.checkExecutors}</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: copy.status.running, value: running, className: 'status-running' },
                { label: copy.status.queued, value: queued, className: 'status-queued' },
                { label: copy.status.failed, value: failed, className: 'status-failed' },
                { label: copy.status.succeeded, value: succeeded, className: 'status-succeeded' },
              ].map(item => (
                <div key={item.label} className="rounded-lg px-4 py-3" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                  <div className={`status-badge ${item.className} px-2 py-0.5`}>{item.label}</div>
                  <div className="mt-3 text-2xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.16)', border: '1px solid var(--border)' }}>
            <div className="section-title mb-1">{copy.dashboard.executionFlow}</div>
            <div className="section-subtitle mb-4">{copy.dashboard.aiSubtitle}</div>
            <div className="space-y-3">
              {copy.dashboard.flow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-faint)', border: '1px solid var(--border)' }}>
                  <span className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ color: '#06100C', background: index === 4 ? 'var(--accent-2)' : 'var(--accent)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-white">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI entry */}
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="metric-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label">{label}</span>
              <span className="text-xs font-mono" style={{ color }}>{icon}</span>
            </div>
            <div className="metric-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/tasks/new" className="primary-action px-4 py-2 rounded-lg text-sm font-medium">{copy.dashboard.quick.newTask}</Link>
        <Link href="/tasks?status=failed" className="secondary-action px-4 py-2 rounded-lg text-sm">{copy.dashboard.quick.failed}</Link>
        <Link href="/reports" className="secondary-action px-4 py-2 rounded-lg text-sm">{copy.dashboard.quick.reports}</Link>
      </div>

      {/* Recent tasks */}
      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="section-title">{copy.dashboard.recentTasks}</div>
            <div className="section-subtitle">{copy.pages.tasks.subtitle}</div>
          </div>
          <Link href="/tasks" className="link-action text-sm">{copy.common.detailsArrow}</Link>
        </div>
        {!recentTasks?.length ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{copy.dashboard.emptyTasks}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="console-table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[copy.common.project, copy.common.suite, copy.common.environment, copy.common.status, copy.common.time].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentTasks as RecentTaskRow[]).map((task) => {
                const s = statusStyle[task.status] ?? statusStyle.queued
                const statusLabel = copy.status[task.status as keyof typeof copy.status] ?? task.status
                return (
                  <tr key={task.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3 font-medium text-white">{relationName(task.projects) ?? '-'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{relationName(task.test_suites) ?? '-'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{task.environment}</td>
                    <td className="px-5 py-3">
                      <span className={`status-badge status-${task.status} px-2 py-0.5`} style={{ color: s.color }}>{statusLabel}</span>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{formatDateTime(task.created_at, locale)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
