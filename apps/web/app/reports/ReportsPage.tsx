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

function markdownValue(value: unknown) {
  if (value == null || value === '') return '-'
  return String(value).replace(/\r\n/g, '\n').trim() || '-'
}

function markdownLink(label: string, url?: string | null) {
  return url ? `[${label}](${url})` : '-'
}

function markdownDataUrl(markdown: string) {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`
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
  const missingReportCount = reports.filter(r => !firstItem(r.reports)).length

  return (
    <div className="page-shell space-y-6">
      <div className="console-hero rounded-xl p-5 page-header">
        <div>
          <h1 className="page-title">{t.pages.reports.title}</h1>
          <p className="page-subtitle">{t.pages.reports.subtitle}</p>
        </div>
        <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
          {reports.map(report => {
            const taskReport = firstItem(report.reports)
            const analysis = firstItem(report.ai_analyses)
            const statusLabel = t.status[report.status as keyof typeof t.status] ?? report.status
            const exportMarkdown = [
              `# MeteorTest Report Analysis Package / MeteorTest 报告分析包`,
              ``,
              `## Task / 任务信息`,
              ``,
              `| Field | Value |`,
              `|---|---|`,
              `| Task ID | ${report.id} |`,
              `| Project | ${markdownValue(relationName(report.projects))} |`,
              `| Suite | ${markdownValue(relationName(report.test_suites))} |`,
              `| Environment | ${markdownValue(report.environment)} |`,
              `| Status | ${markdownValue(statusLabel)} |`,
              `| Created At | ${markdownValue(formatDateTime(report.created_at, locale))} |`,
              `| Started At | ${markdownValue(report.started_at ? formatDateTime(report.started_at, locale) : null)} |`,
              `| Finished At | ${markdownValue(report.finished_at ? formatDateTime(report.finished_at, locale) : null)} |`,
              ``,
              `## Test Report / 测试报告`,
              ``,
              `- Summary: ${markdownValue(taskReport?.summary)}`,
              `- 摘要：${markdownValue(taskReport?.summary)}`,
              `- Log: ${markdownLink(t.reports.log, taskReport?.log_url)}`,
              `- 日志：${markdownLink(t.reports.log, taskReport?.log_url)}`,
              `- Allure: ${markdownLink(t.reports.allure, taskReport?.allure_url)}`,
              `- Allure 报告：${markdownLink(t.reports.allure, taskReport?.allure_url)}`,
              ``,
              `## AI Analysis / AI 分析`,
              ``,
              `- Failure Reason: ${markdownValue(analysis?.failure_reason)}`,
              `- 失败原因：${markdownValue(analysis?.failure_reason)}`,
              `- Impact: ${markdownValue(analysis?.impact)}`,
              `- 影响范围：${markdownValue(analysis?.impact)}`,
              `- Suggestion: ${markdownValue(analysis?.suggestion)}`,
              `- 修复建议：${markdownValue(analysis?.suggestion)}`,
              `- Flaky Probability: ${analysis?.flaky_probability != null ? `${(analysis.flaky_probability * 100).toFixed(0)}%` : '-'}`,
              `- Flaky 概率：${analysis?.flaky_probability != null ? `${(analysis.flaky_probability * 100).toFixed(0)}%` : '-'}`,
              ``,
              `## Prompt Hint / 分析提示词`,
              ``,
              `Please analyze this MeteorTest report package. Focus on failure cause, impact, debugging priority, and whether the issue looks like a test problem, environment problem, or product defect.`,
              ``,
              `请分析这个 MeteorTest 报告分析包。请重点判断：失败原因、影响范围、排查优先级，以及它更像测试脚本问题、环境问题、产品缺陷还是偶发不稳定。请用中文输出，并保留必要英文技术术语。`,
              ``,
            ].join('\n')
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
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <a
                      href={markdownDataUrl(exportMarkdown)}
                      download={`meteortest-report-${report.id}.md`}
                      className="secondary-action rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      {t.reports.exportMarkdown}
                    </a>
                    <Link href={`/tasks/${report.id}`} className="link-action text-sm">
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
          <aside className="data-panel rounded-xl p-5 h-fit space-y-5">
            <div>
              <div className="section-title">{t.reports.aiAnalysis}</div>
              <div className="section-subtitle mt-1">{t.pages.reports.subtitle}</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span style={{ color: 'var(--text-muted)' }}>{t.reports.noReport}</span>
                <span className="text-lg font-bold text-white">{missingReportCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ color: 'var(--text-muted)' }}>{t.reports.analyzed}</span>
                <span className="text-lg font-bold text-white">{analyzedCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ color: 'var(--text-muted)' }}>{t.reports.failed}</span>
                <span className="text-lg font-bold text-white">{failedCount}</span>
              </div>
            </div>
            <Link href="/ai" className="primary-action inline-flex w-full justify-center rounded-lg px-4 py-2 text-sm font-semibold">
              {t.common.aiAssistant}
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
