import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { buildAnalysisPackageMarkdown, markdownDataUrl } from '@/lib/analysisPackage'
import { demoTasks, isLocalDemo } from '@/lib/localDemo'
import { taskRef } from '@/lib/viewModels/displayRefs'
import { testScopeDisplayName } from '@/lib/viewModels/testScopes'

type ReportRow = {
  id: string
  display_id?: string | null
  status: string
  environment: string
  parameters: {
    display_name?: string
    failure_category?: string
    preview_task_key?: string
    safe_demo?: boolean
    pytest?: {
      passed?: number
      failed?: number
      deselected?: number
      exit_code?: number
    }
  } | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string; suite_key?: string | null } | { name: string; suite_key?: string | null }[] | null
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
  const supabase = isLocalDemo() ? null : await createClient()
  const { data } = supabase
    ? await supabase
      .from('tasks')
      .select('id, display_id, status, environment, parameters, created_at, started_at, finished_at, projects(name), test_suites(name, suite_key), reports(summary, log_url, allure_url, created_at), ai_analyses(failure_reason, impact, suggestion, flaky_probability)')
      .order('created_at', { ascending: false })
      .limit(50)
    : { data: demoTasks }

  const reports = (data ?? []) as ReportRow[]
  const totalReports = reports.length
  const succeededCount = reports.filter(r => r.status === 'succeeded').length
  const failedCount = reports.filter(r => r.status === 'failed' || r.status === 'timeout').length
  const analyzedCount = reports.filter(r => firstItem(r.ai_analyses)).length
  const missingReportCount = reports.filter(r => !firstItem(r.reports)).length
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayReports = reports.filter(r => new Date(r.created_at) >= todayStart)
  const todaySucceededCount = todayReports.filter(r => r.status === 'succeeded').length
  const todayFailedCount = todayReports.filter(r => r.status === 'failed' || r.status === 'timeout').length
  const successRate = totalReports > 0 ? `${Math.round((succeededCount / totalReports) * 100)}%` : '-'
  const aiCoverage = totalReports > 0 ? `${Math.round((analyzedCount / totalReports) * 100)}%` : '-'
  const qualityItems = [
    { label: t.reports.todaySucceeded, value: String(todaySucceededCount), tone: 'status-succeeded' },
    { label: t.reports.todayFailed, value: String(todayFailedCount), tone: 'status-failed' },
    { label: t.reports.successRate, value: successRate, tone: 'status-running' },
    { label: t.reports.aiCoverage, value: aiCoverage, tone: 'status-running' },
    { label: t.reports.missingReports, value: String(missingReportCount), tone: missingReportCount > 0 ? 'status-queued' : 'status-succeeded' },
  ]

  return (
    <div className="page-shell space-y-6">
      <div className="console-hero rounded-xl p-5 page-header">
        <div>
          <h1 className="page-title">{t.pages.reports.title}</h1>
          <p className="page-subtitle">{t.pages.reports.subtitle}</p>
        </div>
        <div className="text-xs md:text-right" style={{ color: 'var(--text-muted)' }}>
          <div>{t.reports.resultCount} {totalReports}</div>
          <div>{t.reports.succeeded} {succeededCount} · {t.reports.failed} {failedCount} · {t.reports.analyzed} {analyzedCount}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t.reports.resultCount, value: totalReports, className: 'status-queued' },
          { label: t.reports.succeeded, value: succeededCount, className: 'status-succeeded' },
          { label: t.reports.failed, value: failedCount, className: 'status-failed' },
          { label: t.reports.analyzed, value: analyzedCount, className: 'status-running' },
        ].map(item => (
          <div key={item.label} className="metric-card rounded-xl p-4">
            <div className={`status-badge ${item.className} px-2 py-0.5`}>{item.label}</div>
            <div className="metric-value mt-3">{item.value}</div>
          </div>
        ))}
      </div>

      {!reports.length ? (
        <div className="data-panel rounded-xl">
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.reports.empty}</div>
        </div>
      ) : (
        <div className="proportional-layout">
          <div className="order-2 space-y-4 xl:order-none">
          {reports.map(report => {
            const taskReport = firstItem(report.reports)
            const analysis = firstItem(report.ai_analyses)
            const statusLabel = t.status[report.status as keyof typeof t.status] ?? report.status
            const parameters = report.parameters ?? {}
            const ref = taskRef(report)
            const pytest = parameters.pytest
            const pytestSummary = pytest
              ? [
                  pytest.passed != null ? `${pytest.passed} passed` : null,
                  pytest.failed != null ? `${pytest.failed} failed` : null,
                  pytest.deselected != null ? `${pytest.deselected} deselected` : null,
                  pytest.exit_code != null ? `exit ${pytest.exit_code}` : null,
                ].filter(Boolean).join(', ')
              : ''
            const exportMarkdown = buildAnalysisPackageMarkdown({
              title: t.analysisPackage.reportTitle,
              taskId: ref,
              project: relationName(report.projects),
              suite: testScopeDisplayName(report.test_suites, t.common.testScopes),
              environment: report.environment,
              status: statusLabel,
              createdAt: formatDateTime(report.created_at, locale),
              startedAt: report.started_at ? formatDateTime(report.started_at, locale) : null,
              finishedAt: report.finished_at ? formatDateTime(report.finished_at, locale) : null,
              report: {
                summary: taskReport?.summary,
                logUrl: taskReport?.log_url,
                allureUrl: taskReport?.allure_url,
              },
              analysis: {
                failureReason: analysis?.failure_reason,
                impact: analysis?.impact,
                suggestion: analysis?.suggestion,
                flakyProbability: analysis?.flaky_probability,
              },
            }, t)
            return (
              <div key={report.id} className="data-panel rounded-xl p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-badge status-${report.status} px-2 py-0.5`}>{statusLabel}</span>
                      {parameters.safe_demo ? <span className="status-badge status-running px-2 py-0.5">{t.taskDetail.previewTask}</span> : null}
                      <span className="text-sm text-white font-medium">{relationName(report.projects) ?? '-'}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{testScopeDisplayName(report.test_suites, t.common.testScopes) || '-'}</span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {parameters.display_name ? `${parameters.display_name} · ` : ''}{t.reports.environment} {report.environment} · {t.reports.created} {formatDateTime(report.created_at, locale)}
                    </div>
                    {(report.started_at || report.finished_at) && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {report.started_at ? `${t.common.startedAt} ${formatDateTime(report.started_at, locale)}` : ''}
                        {report.started_at && report.finished_at ? ' · ' : ''}
                        {report.finished_at ? `${t.common.finishedAt} ${formatDateTime(report.finished_at, locale)}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="mobile-action-grid flex shrink-0 flex-wrap items-center gap-2 sm:flex">
                    <a
                      href={markdownDataUrl(exportMarkdown)}
                      download={`meteortest-report-${ref}.md`}
                      className="secondary-action inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold"
                    >
                      {t.reports.exportMarkdown}
                    </a>
                    <Link href={`/tasks/${ref}`} className="chip-action inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold">
                      {t.reports.taskDetails}
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="panel-inner rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.reports.testResult}</div>
                    {taskReport ? (
                      <div className="space-y-2">
                        {taskReport.summary && <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{taskReport.summary}</div>}
                        {(pytestSummary || parameters.failure_category) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {pytestSummary ? <span className="status-badge status-succeeded px-2 py-0.5">{t.taskDetail.pytestSummary}: {pytestSummary}</span> : null}
                            {parameters.failure_category ? <span className="status-badge status-failed px-2 py-0.5">{t.taskDetail.failureCategory}: {parameters.failure_category}</span> : null}
                          </div>
                        )}
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
                        {analysis.failure_reason && <div><span style={{ color: 'var(--text-muted)' }}>{t.reports.failureReason}</span><span style={{ color: 'var(--status-failed-text)' }}>{analysis.failure_reason}</span></div>}
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
          <aside className="order-1 self-start space-y-3 xl:order-none" style={{ alignSelf: 'start' }}>
            <div className="reports-insight-panel data-panel h-fit rounded-xl p-5">
              <div>
                <div className="section-title">{t.reports.qualityOverview}</div>
                <div className="section-subtitle mt-1">{t.reports.qualityOverviewDesc}</div>
              </div>
              <div className="reports-quality-grid mt-5">
                {qualityItems.map((item, index) => (
                  <div key={item.label} className={`reports-quality-card panel-inner rounded-lg ${index === qualityItems.length - 1 ? 'is-wide' : ''}`}>
                    <div className={`status-badge ${item.tone} px-2 py-0.5`}>{item.label}</div>
                    <div className="mt-2 text-2xl font-bold text-white min-[1800px]:mt-3 min-[1800px]:text-3xl">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reports-insight-footer flex h-[68px] items-center rounded-xl px-3">
              <Link href="/ai" className="reports-ai-link primary-action inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold leading-none">
                {t.reports.openAiTriage}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
