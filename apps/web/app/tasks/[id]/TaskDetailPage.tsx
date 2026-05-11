import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { buildAnalysisPackageMarkdown, markdownDataUrl } from '@/lib/analysisPackage'

const statusStyle: Record<string, { bg: string; color: string }> = {
  queued:    { bg: 'var(--status-queued-bg)', color: 'var(--status-queued-text)' },
  running:   { bg: 'var(--status-running-bg)', color: 'var(--status-running-text)' },
  succeeded: { bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  failed:    { bg: 'var(--status-failed-bg)', color: 'var(--status-failed-text)' },
  cancelled: { bg: 'var(--status-queued-bg)', color: 'var(--status-queued-text)' },
  timeout:   { bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
}

type TaskParameters = {
  display_name?: string
  failure_category?: string
  notes?: string
  preview_task_key?: string
  safe_demo?: boolean
  pytest?: {
    passed?: number
    failed?: number
    deselected?: number
    exit_code?: number
  }
}

function isDiagnosticStatus(status: string) {
  return status === 'failed' || status === 'timeout'
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
  const parameters = (task.parameters ?? {}) as TaskParameters
  const displayName = parameters.display_name || task.id
  const pytest = parameters.pytest
  const pytestSummary = pytest
    ? [
        pytest.passed != null ? `${pytest.passed} passed` : null,
        pytest.failed != null ? `${pytest.failed} failed` : null,
        pytest.deselected != null ? `${pytest.deselected} deselected` : null,
        pytest.exit_code != null ? `exit ${pytest.exit_code}` : null,
      ].filter(Boolean).join(', ')
    : ''
  const shouldShowDiagnostic = isDiagnosticStatus(task.status)
  const diagnosticEvidence: { label: string; value: string }[] = []
  if (report?.summary) diagnosticEvidence.push({ label: t.taskDetail.reportEvidence, value: report.summary })
  if (pytestSummary) diagnosticEvidence.push({ label: t.taskDetail.pytestEvidence, value: pytestSummary })
  if (parameters.failure_category) diagnosticEvidence.push({ label: t.taskDetail.categoryEvidence, value: parameters.failure_category })
  if (parameters.notes) diagnosticEvidence.push({ label: t.taskDetail.noteEvidence, value: parameters.notes })
  const diagnosticNextActions = analysis?.suggestion
    ? [analysis.suggestion, ...t.reports.defaultNextSteps]
    : t.reports.defaultNextSteps

  const meta = [
    { label: t.common.project, value: task.projects?.name ?? '-' },
    { label: t.common.suite, value: task.test_suites?.name ?? '-' },
    { label: t.common.environment, value: task.environment },
    { label: t.common.executor, value: task.executors?.name ?? '-' },
    { label: t.common.createdAt, value: formatDateTime(task.created_at, locale) },
    ...(task.started_at ? [{ label: t.common.startedAt, value: formatDateTime(task.started_at, locale) }] : []),
    ...(task.finished_at ? [{ label: t.common.finishedAt, value: formatDateTime(task.finished_at, locale) }] : []),
  ]
  const exportMarkdown = buildAnalysisPackageMarkdown({
    title: t.analysisPackage.taskTitle,
    taskId: task.id,
    project: task.projects?.name,
    suite: task.test_suites?.name,
    environment: task.environment,
    status: statusLabel,
    executor: task.executors?.name,
    createdAt: formatDateTime(task.created_at, locale),
    startedAt: task.started_at ? formatDateTime(task.started_at, locale) : null,
    finishedAt: task.finished_at ? formatDateTime(task.finished_at, locale) : null,
    command: task.test_suites?.command,
    report: {
      summary: report?.summary,
      logUrl: report?.log_url,
      allureUrl: report?.allure_url,
    },
    analysis: {
      failureReason: analysis?.failure_reason,
      impact: analysis?.impact,
      suggestion: analysis?.suggestion,
      flakyProbability: analysis?.flaky_probability,
    },
  }, t)
  const exportFilename = `meteortest-task-${task.id}.md`

  return (
    <div className="page-shell space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/tasks" className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.tasks.title}</Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.taskDetail.breadcrumb}</span>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <span className={`status-badge status-${task.status} items-center gap-1.5 px-2.5 py-1`} style={{ background: s.bg, color: s.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{statusLabel}
            </span>
            {parameters.safe_demo ? (
              <span className="status-badge status-running items-center gap-1.5 px-2.5 py-1">
                {t.taskDetail.previewTask}
              </span>
            ) : null}
          </div>
          <a
            href={markdownDataUrl(exportMarkdown)}
            download={exportFilename}
            className="secondary-action inline-flex w-fit rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {t.reports.exportMarkdown}
          </a>
        </div>
      </div>

      {shouldShowDiagnostic ? (
        <div className="data-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{t.taskDetail.diagnosticTitle}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.diagnosticSubtitle}</div>
              </div>
              <span className="status-badge status-failed w-fit px-2 py-0.5">
                {parameters.failure_category || statusLabel}
              </span>
            </div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.whatHappened}</div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {analysis?.failure_reason || report?.summary || t.taskDetail.noDiagnosticReason}
                </p>
              </div>
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.evidence}</div>
                {diagnosticEvidence.length ? (
                  <div className="space-y-2">
                    {diagnosticEvidence.map(item => (
                      <div key={item.label} className="grid gap-1 text-sm md:grid-cols-[140px_minmax(0,1fr)]">
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.noDiagnosticEvidence}</div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.nextActions}</div>
                <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {diagnosticNextActions.map(step => <li key={step}>- {step}</li>)}
                </ul>
              </div>
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.openEvidence}</div>
                <div className="flex flex-wrap gap-3">
                  {report?.log_url ? <a href={report.log_url} target="_blank" className="link-action text-sm">{t.reports.log}</a> : null}
                  {report?.allure_url ? <a href={report.allure_url} target="_blank" className="link-action text-sm">{t.reports.allure}</a> : null}
                  <a
                    href={markdownDataUrl(exportMarkdown)}
                    download={exportFilename}
                    className="link-action text-sm"
                  >
                    {t.reports.exportMarkdown}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
        {(pytestSummary || parameters.failure_category) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pytestSummary ? (
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.pytestSummary}</div>
                <div className="text-sm text-white">{pytestSummary}</div>
              </div>
            ) : null}
            {parameters.failure_category ? (
              <div className="panel-inner rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.failureCategory}</div>
                <div className="text-sm text-white">{parameters.failure_category}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Report */}
      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold text-white">{t.taskDetail.report}</span>
        </div>
        <div className="p-5 space-y-3">
          {report ? (
            <>
              {report.summary && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>}
              <div className="flex gap-3">
                {report.log_url && <a href={report.log_url} target="_blank" className="link-action text-sm">{t.reports.log}</a>}
                {report.allure_url && <a href={report.allure_url} target="_blank" className="link-action text-sm">{t.reports.allure}</a>}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.waitingForReport}</p>
          )}
          </div>
        </div>

      {/* AI Analysis */}
      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">✦</span>
            <span className="text-sm font-semibold text-white">{t.taskDetail.aiFailureAnalysis}</span>
          </div>
          <span className={`status-badge ${analysis ? 'status-running' : 'status-queued'} px-2 py-0.5`}>
            {analysis ? t.reports.analyzed : t.reports.noAnalysisShort}
          </span>
        </div>
        <div className="p-5 space-y-4">
          {analysis ? (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {[
                  { label: t.reports.failureReason, value: analysis.failure_reason },
                  { label: t.reports.impact, value: analysis.impact },
                  { label: t.reports.suggestion, value: analysis.suggestion },
                ].map(({ label, value }) => (
                  <div key={label} className="panel-inner rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: value ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{value || '-'}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="panel-inner rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.reports.nextSteps}</div>
                  <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.reports.defaultNextSteps.map(step => <li key={step}>- {step}</li>)}
                  </ul>
                </div>
                <div className="panel-inner rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.taskDetail.flakyProbability}</div>
                  {analysis.flaky_probability != null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${(analysis.flaky_probability * 100).toFixed(0)}%`, background: 'var(--accent)' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{(analysis.flaky_probability * 100).toFixed(0)}%</span>
                    </div>
                  ) : <div className="text-sm" style={{ color: 'var(--text-muted)' }}>-</div>}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.reports.noAnalysis}</div>
          )}
        </div>
      </div>
    </div>
  )
}
