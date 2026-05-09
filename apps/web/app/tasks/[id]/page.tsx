import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'

const statusStyle: Record<string, { bg: string; color: string }> = {
  queued:    { bg: '#1a2438', color: '#64748B' },
  running:   { bg: '#0D1F3C', color: '#3B82F6' },
  succeeded: { bg: '#0D2818', color: '#22C55E' },
  failed:    { bg: '#2A0F0F', color: '#EF4444' },
  cancelled: { bg: '#1a2438', color: '#475569' },
  timeout:   { bg: '#2A1A0A', color: '#F97316' },
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getDictionary()
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('*, projects(name), test_suites(name, command), executors(name), reports(*), ai_analyses(*)')
    .eq('id', id).single()
  if (!task) notFound()

  const report = task.reports?.[0]
  const analysis = task.ai_analyses?.[0]
  const s = statusStyle[task.status] ?? statusStyle.queued
  const statusLabel = t.status[task.status as keyof typeof t.status] ?? task.status

  const meta = [
    { label: t.common.project, value: task.projects?.name ?? '-' },
    { label: t.common.suite, value: task.test_suites?.name ?? '-' },
    { label: t.common.environment, value: task.environment },
    { label: t.common.executor, value: task.executors?.name ?? '-' },
    { label: t.common.createdAt, value: formatDateTime(task.created_at, locale) },
    ...(task.started_at ? [{ label: t.common.startedAt, value: formatDateTime(task.started_at, locale) }] : []),
    ...(task.finished_at ? [{ label: t.common.finishedAt, value: formatDateTime(task.finished_at, locale) }] : []),
  ]

  return (
    <div className="page-shell space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/tasks" className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.tasks.title}</Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.taskDetail.breadcrumb}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{t.taskDetail.title}</h1>
          <span className={`status-badge status-${task.status} items-center gap-1.5 px-2.5 py-1`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{statusLabel}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="data-panel rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          {meta.map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="text-sm text-white">{value}</div>
            </div>
          ))}
        </div>
        {task.test_suites?.command && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.command}</div>
            <code className="panel-inner text-xs font-mono px-3 py-2 rounded-lg block" style={{ color: 'var(--accent)' }}>{task.test_suites.command}</code>
          </div>
        )}
      </div>

      {/* Report */}
      {report && (
        <div className="data-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold text-white">{t.taskDetail.report}</span>
          </div>
          <div className="p-5 space-y-3">
            {report.summary && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>}
            <div className="flex gap-3">
              {report.log_url && <a href={report.log_url} target="_blank" className="link-action text-sm">{t.reports.log}</a>}
              {report.allure_url && <a href={report.allure_url} target="_blank" className="link-action text-sm">{t.reports.allure}</a>}
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="data-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
            <span className="text-base">✦</span>
            <span className="text-sm font-semibold text-white">{t.taskDetail.aiFailureAnalysis}</span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: t.reports.failureReason, value: analysis.failure_reason },
              { label: t.reports.impact, value: analysis.impact },
              { label: t.reports.suggestion, value: analysis.suggestion },
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{value}</div>
              </div>
            ))}
            {analysis.flaky_probability != null && (
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.flakyProbability}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(analysis.flaky_probability * 100).toFixed(0)}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{(analysis.flaky_probability * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
