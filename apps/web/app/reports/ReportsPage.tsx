import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'

type ReportRow = {
  id: string
  status: string
  environment: string
  created_at: string
  started_at: string | null
  finished_at: string | null
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
  reports: { summary: string | null; log_url: string | null; allure_url: string | null; created_at: string }[] | null
  ai_analyses: { failure_reason: string | null; impact: string | null; suggestion: string | null; flaky_probability: number | null }[] | null
}

function relationName(value: { name: string } | { name: string }[] | null) {
  return Array.isArray(value) ? value[0]?.name : value?.name
}

function firstItem<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ReportsPage() {
  const locale = await getLocale()
  const t = await getDictionary()
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('id, status, environment, created_at, started_at, finished_at, projects(name), test_suites(name), reports(summary, log_url, allure_url, created_at), ai_analyses(failure_reason, impact, suggestion, flaky_probability)')
    .order('created_at', { ascending: false })
    .limit(50)

  const reports = (data ?? []) as ReportRow[]
  const totalReports = reports.length
  const succeededCount = reports.filter(r => r.status === 'succeeded').length
  const failedCount = reports.filter(r => r.status === 'failed' || r.status === 'timeout').length
  const analyzedCount = reports.filter(r => firstItem(r.ai_analyses)).length

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.pages.reports.title}</h1>
          <p className="page-subtitle">{t.pages.reports.subtitle}</p>
        </div>
        <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
          <div>{t.reports.resultCount} {totalReports}</div>
          <div>{t.reports.succeeded} {succeededCount} · {t.reports.failed} {failedCount} · {t.reports.analyzed} {analyzedCount}</div>
        </div>
      </div>

      {!reports.length ? (
        <div className="data-panel rounded-xl">
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.reports.empty}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const taskReport = firstItem(report.reports)
            const analysis = firstItem(report.ai_analyses)
            const statusLabel = t.status[report.status as keyof typeof t.status] ?? report.status
            return (
              <div key={report.id} className="data-panel rounded-xl p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-badge status-${report.status} px-2 py-0.5`}>{statusLabel}</span>
                      <span className="text-sm text-white font-medium">{relationName(report.projects) ?? '-'}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{relationName(report.test_suites) ?? '-'}</span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t.reports.environment} {report.environment} · {t.reports.created} {formatDateTime(report.created_at, locale)}
                    </div>
                    {(report.started_at || report.finished_at) && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {report.started_at ? `${t.common.startedAt} ${formatDateTime(report.started_at, locale)}` : ''}
                        {report.started_at && report.finished_at ? ' · ' : ''}
                        {report.finished_at ? `${t.common.finishedAt} ${formatDateTime(report.finished_at, locale)}` : ''}
                      </div>
                    )}
                  </div>
                  <Link href={`/tasks/${report.id}`} className="link-action text-sm shrink-0">
                    {t.reports.taskDetails}
                  </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="panel-inner rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.reports.testResult}</div>
                    {taskReport ? (
                      <div className="space-y-2">
                        {taskReport.summary && <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{taskReport.summary}</div>}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {taskReport.log_url && <a href={taskReport.log_url} target="_blank" className="link-action">{t.reports.log}</a>}
                          {taskReport.allure_url && <a href={taskReport.allure_url} target="_blank" className="link-action">{t.reports.allure}</a>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.reports.noReport}</div>
                    )}
                  </div>

                  <div className="panel-inner rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.reports.aiAnalysis}</div>
                    {analysis ? (
                      <div className="space-y-2 text-sm">
                        {analysis.failure_reason && <div><span style={{ color: 'var(--text-muted)' }}>{t.reports.failureReason}</span><span style={{ color: '#FCA5A5' }}>{analysis.failure_reason}</span></div>}
                        {analysis.impact && <div><span style={{ color: 'var(--text-muted)' }}>{t.reports.impact}</span><span style={{ color: 'var(--text-secondary)' }}>{analysis.impact}</span></div>}
                        {analysis.suggestion && <div><span style={{ color: 'var(--text-muted)' }}>{t.reports.suggestion}</span><span style={{ color: 'var(--text-secondary)' }}>{analysis.suggestion}</span></div>}
                        {analysis.flaky_probability != null && (
                          <div className="pt-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${(analysis.flaky_probability * 100).toFixed(0)}%`, background: 'var(--accent)' }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{(analysis.flaky_probability * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.reports.noAnalysis}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
