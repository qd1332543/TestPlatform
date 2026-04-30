import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  queued:    { bg: '#1a2438', color: '#64748B', label: '排队中' },
  running:   { bg: '#0D1F3C', color: '#3B82F6', label: '执行中' },
  succeeded: { bg: '#0D2818', color: '#22C55E', label: '成功' },
  failed:    { bg: '#2A0F0F', color: '#EF4444', label: '失败' },
  cancelled: { bg: '#1a2438', color: '#475569', label: '已取消' },
  timeout:   { bg: '#2A1A0A', color: '#F97316', label: '超时' },
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('*, projects(name), test_suites(name, command), executors(name), reports(*), ai_analyses(*)')
    .eq('id', id).single()
  if (!task) notFound()

  const report = task.reports?.[0]
  const analysis = task.ai_analyses?.[0]
  const s = statusStyle[task.status] ?? statusStyle.queued

  const meta = [
    { label: '项目', value: task.projects?.name ?? '-' },
    { label: '套件', value: task.test_suites?.name ?? '-' },
    { label: '环境', value: task.environment },
    { label: '执行器', value: task.executors?.name ?? '-' },
    { label: '创建时间', value: new Date(task.created_at).toLocaleString('zh-CN') },
    ...(task.started_at ? [{ label: '开始时间', value: new Date(task.started_at).toLocaleString('zh-CN') }] : []),
    ...(task.finished_at ? [{ label: '结束时间', value: new Date(task.finished_at).toLocaleString('zh-CN') }] : []),
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/tasks" className="text-sm" style={{ color: 'var(--text-muted)' }}>任务中心</Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>任务详情</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">任务详情</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{s.label}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>执行命令</div>
            <code className="text-xs font-mono px-3 py-2 rounded-lg block" style={{ background: '#0A0F1E', color: '#60A5FA', border: '1px solid var(--border)' }}>{task.test_suites.command}</code>
          </div>
        )}
      </div>

      {/* Report */}
      {report && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold text-white">测试报告</span>
          </div>
          <div className="p-5 space-y-3">
            {report.summary && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>}
            <div className="flex gap-3">
              {report.log_url && <a href={report.log_url} target="_blank" className="text-sm font-medium" style={{ color: '#3B82F6' }}>查看日志 →</a>}
              {report.allure_url && <a href={report.allure_url} target="_blank" className="text-sm font-medium" style={{ color: '#3B82F6' }}>Allure 报告 →</a>}
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid #1E3A5F' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: '#0D1829' }}>
            <span className="text-base">✦</span>
            <span className="text-sm font-semibold text-white">AI 失败分析</span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: '失败原因', value: analysis.failure_reason },
              { label: '影响范围', value: analysis.impact },
              { label: '修复建议', value: analysis.suggestion },
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{value}</div>
              </div>
            ))}
            {analysis.flaky_probability != null && (
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Flaky 概率</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(analysis.flaky_probability * 100).toFixed(0)}%`, background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#60A5FA' }}>{(analysis.flaky_probability * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
