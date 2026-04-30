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
    { label: '今日任务', value: String(total), icon: '◈', color: '#3B82F6' },
    { label: '成功率', value: successRate, icon: '◉', color: '#22C55E' },
    { label: '失败任务', value: String(failed), icon: '◎', color: failed > 0 ? '#EF4444' : '#64748B' },
    { label: '平均耗时', value: avgDuration, icon: '◷', color: '#A78BFA' },
  ]

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>今日测试概览</p>
      </div>

      {/* AI 入口 */}
      <Link href="/ai" className="flex items-center gap-4 rounded-2xl p-5 transition-all group"
        style={{ background: 'linear-gradient(135deg, #0D1829 0%, #111827 100%)', border: '1px solid #1E3A5F' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 4px 20px #3B82F650' }}>✦</div>
        <div className="flex-1">
          <div className="font-semibold text-white text-base">AI 助手</div>
          <div className="text-sm mt-0.5" style={{ color: '#60A5FA' }}>分析测试结果、创建任务、查询报告 · 由 DeepSeek 驱动</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: '#3B82F6' }} className="group-hover:translate-x-1 transition-transform">
          <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color }}>{icon}</span>
            </div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/tasks/new" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>新建任务</Link>
        <Link href="/tasks?status=failed" className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>查看失败</Link>
        <Link href="/reports" className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>查看报告</Link>
      </div>

      {/* Recent tasks */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
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
