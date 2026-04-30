import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type RecentTaskRow = {
  id: string
  status: string
  environment: string
  created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
}

function relationName(relation: { name: string } | { name: string }[] | null) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

const statusMap: Record<string, string> = {
  queued: '排队中', running: '执行中', succeeded: '成功',
  failed: '失败', cancelled: '已取消', timeout: '超时',
}
const statusStyle: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-50 text-blue-600',
  succeeded: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-400',
  timeout: 'bg-orange-50 text-orange-600',
}

export default async function Dashboard() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, started_at, finished_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })

  const total = tasks?.length ?? 0
  const succeeded = tasks?.filter(t => t.status === 'succeeded').length ?? 0
  const failed = tasks?.filter(t => t.status === 'failed').length ?? 0
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) + '%' : '-'

  const durations = tasks
    ?.filter(t => t.started_at && t.finished_at)
    .map(t => new Date(t.finished_at).getTime() - new Date(t.started_at).getTime())
  const avgDuration = durations && durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000) + 's'
    : '-'

  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { label: '今日任务', value: String(total), color: 'text-gray-900' },
    { label: '成功率', value: successRate, color: 'text-green-600' },
    { label: '失败任务', value: String(failed), color: failed > 0 ? 'text-red-500' : 'text-gray-900' },
    { label: '平均耗时', value: avgDuration, color: 'text-gray-900' },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">今日测试概览</p>
      </div>

      {/* AI 入口 */}
      <Link href="/ai" className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all group">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">✦</div>
        <div className="flex-1">
          <div className="font-semibold text-base">AI 助手</div>
          <div className="text-indigo-200 text-sm mt-0.5">分析测试结果、创建任务、查询报告 · 由 DeepSeek 驱动</div>
        </div>
        <div className="text-indigo-300 group-hover:translate-x-1 transition-transform text-lg">→</div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</div>
            <div className={`text-3xl font-bold mt-2 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/tasks/new" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium transition-colors">新建任务</Link>
        <Link href="/tasks?status=failed" className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">查看失败</Link>
        <Link href="/reports" className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">查看报告</Link>
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-800">最近任务</span>
        </div>
        {!recentTasks?.length ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">暂无任务</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="px-5 py-3 font-medium">项目</th>
                <th className="px-5 py-3 font-medium">套件</th>
                <th className="px-5 py-3 font-medium">环境</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {(recentTasks as RecentTaskRow[]).map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-gray-800 font-medium">{relationName(t.projects) ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{relationName(t.test_suites) ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500">{t.environment}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusMap[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
