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
    <div className="space-y-6 w-full max-w-7xl">
      <section className="glass-panel rounded-2xl p-6 overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="space-y-5">
            <div>
              <div className="kicker mb-2">{copy.dashboard.kicker}</div>
              <h1 className="text-3xl font-bold text-white">{copy.dashboard.title}</h1>
              <p className="text-sm mt-2 max-w-2xl leading-6" style={{ color: 'var(--text-secondary)' }}>
                {copy.dashboard.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/tasks/new" className="px-4 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#06100C' }}>{copy.dashboard.newTask}</Link>
              <Link href="/ai" className="px-4 py-2.5 rounded-full text-sm transition-colors"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{copy.dashboard.openAi}</Link>
              <Link href="/executors" className="px-4 py-2.5 rounded-full text-sm transition-colors"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{copy.dashboard.checkExecutors}</Link>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)' }}>
            <div className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>{copy.dashboard.executionFlow}</div>
            <div className="space-y-3">
              {copy.dashboard.flow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(12,15,16,0.46)', border: '1px solid var(--border)' }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ color: '#06100C', background: index === 4 ? 'var(--accent-2)' : 'var(--accent)' }}>
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
      <Link href="/ai" className="flex items-center gap-4 rounded-2xl p-5 transition-all group glass-panel">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(145deg, rgba(116,214,179,0.28), rgba(242,199,110,0.14))', border: '1px solid rgba(116,214,179,0.42)' }}>✦</div>
        <div className="flex-1">
          <div className="font-semibold text-white text-base">{copy.dashboard.aiTitle}</div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--accent)' }}>{copy.dashboard.aiSubtitle}</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--accent)' }} className="group-hover:translate-x-1 transition-transform">
          <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-xs font-mono" style={{ color }}>{icon}</span>
            </div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/tasks/new" className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#06100C' }}>{copy.dashboard.quick.newTask}</Link>
        <Link href="/tasks?status=failed" className="px-4 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{copy.dashboard.quick.failed}</Link>
        <Link href="/reports" className="px-4 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{copy.dashboard.quick.reports}</Link>
      </div>

      {/* Recent tasks */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold text-white">{copy.dashboard.recentTasks}</span>
        </div>
        {!recentTasks?.length ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{copy.dashboard.emptyTasks}</div>
        ) : (
          <table className="w-full text-sm">
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
        )}
      </div>
    </div>
  )
}
