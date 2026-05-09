import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type RecentTaskRow = {
  id: string; status: string; environment: string; created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  queued:    { bg: '#1a2438', color: '#64748B', label: '排队中' },
  running:   { bg: '#0D1F3C', color: '#3B82F6', label: '执行中' },
  succeeded: { bg: '#0D2818', color: '#22C55E', label: '成功' },
  failed:    { bg: '#2A0F0F', color: '#EF4444', label: '失败' },
  cancelled: { bg: '#1a2438', color: '#475569', label: '已取消' },
  timeout:   { bg: '#2A1A0A', color: '#F97316', label: '超时' },
}

export default async function Dashboard() {
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
    { label: '今日任务', value: String(total), icon: '01', color: 'var(--accent)' },
    { label: '成功率', value: successRate, icon: '02', color: '#22C55E' },
    { label: '失败任务', value: String(failed), icon: '03', color: failed > 0 ? '#EF4444' : 'var(--text-muted)' },
    { label: '平均耗时', value: avgDuration, icon: '04', color: 'var(--accent-2)' },
  ]

  return (
    <div className="space-y-6 w-full max-w-7xl">
      <section className="glass-panel rounded-2xl p-6 overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="space-y-5">
            <div>
              <div className="kicker mb-2">METEORTEST CONTROL PLANE</div>
              <h1 className="text-3xl font-bold text-white">测试执行工作台</h1>
              <p className="text-sm mt-2 max-w-2xl leading-6" style={{ color: 'var(--text-secondary)' }}>
                管理项目、套件、构建产物与本地执行器，把自动化测试任务从创建、执行、报告到 AI 分析串成一条闭环。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/tasks/new" className="px-4 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#06100C' }}>新建测试任务</Link>
              <Link href="/ai" className="px-4 py-2.5 rounded-full text-sm transition-colors"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>打开 AI 助手</Link>
              <Link href="/executors" className="px-4 py-2.5 rounded-full text-sm transition-colors"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>检查执行器</Link>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)' }}>
            <div className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>执行链路</div>
            <div className="space-y-3">
              {['导入测试套件', '登记构建产物', '创建测试任务', 'Agent 轮询执行', '报告与 AI 分析'].map((step, index) => (
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

      {/* AI 入口 */}
      <Link href="/ai" className="flex items-center gap-4 rounded-2xl p-5 transition-all group glass-panel">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(145deg, rgba(116,214,179,0.28), rgba(242,199,110,0.14))', border: '1px solid rgba(116,214,179,0.42)' }}>✦</div>
        <div className="flex-1">
          <div className="font-semibold text-white text-base">AI 助手</div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--accent)' }}>分析测试结果、创建任务、查询报告 · 由 DeepSeek 驱动</div>
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
          style={{ background: 'var(--accent)', color: '#06100C' }}>新建任务</Link>
        <Link href="/tasks?status=failed" className="px-4 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>查看失败</Link>
        <Link href="/reports" className="px-4 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>查看报告</Link>
      </div>

      {/* Recent tasks */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold text-white">最近任务</span>
        </div>
        {!recentTasks?.length ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无任务</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['项目', '套件', '环境', '状态', '时间'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentTasks as RecentTaskRow[]).map((t) => {
                const s = statusStyle[t.status] ?? statusStyle.queued
                return (
                  <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3 font-medium text-white">{relationName(t.projects) ?? '-'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{relationName(t.test_suites) ?? '-'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{t.environment}</td>
                    <td className="px-5 py-3">
                      <span className={`status-badge status-${t.status} px-2 py-0.5`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString('zh-CN')}</td>
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
