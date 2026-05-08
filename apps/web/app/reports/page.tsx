import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  queued: { bg: '#1a2438', color: '#64748B', label: '排队中' },
  running: { bg: '#0D1F3C', color: '#3B82F6', label: '执行中' },
  succeeded: { bg: '#0D2818', color: '#22C55E', label: '成功' },
  failed: { bg: '#2A0F0F', color: '#EF4444', label: '失败' },
  cancelled: { bg: '#1a2438', color: '#475569', label: '已取消' },
  timeout: { bg: '#2A1A0A', color: '#F97316', label: '超时' },
}

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
    <div className="space-y-6 w-full">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">报告中心</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>查看测试结果、日志链接和 AI 分析结论</p>
        </div>
        <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
          <div>结果 {totalReports}</div>
          <div>成功 {succeededCount} · 失败 {failedCount} · 已分析 {analyzedCount}</div>
        </div>
      </div>

      {!reports.length ? (
        <div className="rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无报告。先创建任务并等待执行器回传结果。</div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const s = statusStyle[report.status] ?? statusStyle.queued
            const taskReport = firstItem(report.reports)
            const analysis = firstItem(report.ai_analyses)
            return (
              <div key={report.id} className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      <span className="text-sm text-white font-medium">{relationName(report.projects) ?? '-'}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{relationName(report.test_suites) ?? '-'}</span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      环境 {report.environment} · 创建于 {new Date(report.created_at).toLocaleString('zh-CN')}
                    </div>
                    {(report.started_at || report.finished_at) && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {report.started_at ? `开始 ${new Date(report.started_at).toLocaleString('zh-CN')}` : ''}
                        {report.started_at && report.finished_at ? ' · ' : ''}
                        {report.finished_at ? `结束 ${new Date(report.finished_at).toLocaleString('zh-CN')}` : ''}
                      </div>
                    )}
                  </div>
                  <Link href={`/tasks/${report.id}`} className="text-sm font-medium shrink-0" style={{ color: '#3B82F6' }}>
                    查看任务详情 →
                  </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg p-4" style={{ background: '#0A0F1E', border: '1px solid var(--border)' }}>
                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>测试结果</div>
                    {taskReport ? (
                      <div className="space-y-2">
                        {taskReport.summary && <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{taskReport.summary}</div>}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {taskReport.log_url && <a href={taskReport.log_url} target="_blank" className="font-medium" style={{ color: '#60A5FA' }}>查看日志</a>}
                          {taskReport.allure_url && <a href={taskReport.allure_url} target="_blank" className="font-medium" style={{ color: '#60A5FA' }}>Allure 报告</a>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>没有测试结果记录，通常表示执行器还未回传 report。</div>
                    )}
                  </div>

                  <div className="rounded-lg p-4" style={{ background: '#0A0F1E', border: '1px solid var(--border)' }}>
                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>AI 分析</div>
                    {analysis ? (
                      <div className="space-y-2 text-sm">
                        {analysis.failure_reason && <div><span style={{ color: 'var(--text-muted)' }}>失败原因：</span><span style={{ color: '#FCA5A5' }}>{analysis.failure_reason}</span></div>}
                        {analysis.impact && <div><span style={{ color: 'var(--text-muted)' }}>影响范围：</span><span style={{ color: 'var(--text-secondary)' }}>{analysis.impact}</span></div>}
                        {analysis.suggestion && <div><span style={{ color: 'var(--text-muted)' }}>修复建议：</span><span style={{ color: 'var(--text-secondary)' }}>{analysis.suggestion}</span></div>}
                        {analysis.flaky_probability != null && (
                          <div className="pt-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${(analysis.flaky_probability * 100).toFixed(0)}%`, background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: '#60A5FA' }}>{(analysis.flaky_probability * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>没有 AI 分析记录。一般是任务还没失败，或者分析任务还没跑完。</div>
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
