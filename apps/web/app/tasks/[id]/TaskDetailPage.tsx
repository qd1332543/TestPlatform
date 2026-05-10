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
  const exportMarkdown = [
    `# MeteorTest Task Analysis Package / MeteorTest 任务分析包`,
    ``,
    `## Task / 任务信息`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Task ID | ${task.id} |`,
    `| Project | ${markdownValue(task.projects?.name)} |`,
    `| Suite | ${markdownValue(task.test_suites?.name)} |`,
    `| Environment | ${markdownValue(task.environment)} |`,
    `| Status | ${markdownValue(statusLabel)} |`,
    `| Executor | ${markdownValue(task.executors?.name)} |`,
    `| Created At | ${markdownValue(formatDateTime(task.created_at, locale))} |`,
    `| Started At | ${markdownValue(task.started_at ? formatDateTime(task.started_at, locale) : null)} |`,
    `| Finished At | ${markdownValue(task.finished_at ? formatDateTime(task.finished_at, locale) : null)} |`,
    ``,
    `## Execution Command / 执行命令`,
    ``,
    '```bash',
    markdownValue(task.test_suites?.command),
    '```',
    ``,
    `## Test Report / 测试报告`,
    ``,
    `- Summary: ${markdownValue(report?.summary)}`,
    `- 摘要：${markdownValue(report?.summary)}`,
    `- Log: ${markdownLink(t.reports.log, report?.log_url)}`,
    `- 日志：${markdownLink(t.reports.log, report?.log_url)}`,
    `- Allure: ${markdownLink(t.reports.allure, report?.allure_url)}`,
    `- Allure 报告：${markdownLink(t.reports.allure, report?.allure_url)}`,
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
    `Please analyze this MeteorTest task package. Focus on likely failure cause, impact, next debugging steps, and whether this looks like test instability, environment failure, or product defect.`,
    ``,
    `请分析这个 MeteorTest 任务分析包。请重点判断：可能失败原因、影响范围、下一步排查动作，以及它更像测试脚本问题、环境问题、产品缺陷还是偶发不稳定。请用中文输出，并保留必要英文技术术语。`,
    ``,
  ].join('\n')
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
            <h1 className="text-2xl font-bold text-white">{t.taskDetail.title}</h1>
            <span className={`status-badge status-${task.status} items-center gap-1.5 px-2.5 py-1`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{statusLabel}
            </span>
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
