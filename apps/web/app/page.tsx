import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    { label: '今日任务', value: String(total) },
    { label: '成功率', value: successRate },
    { label: '失败任务', value: String(failed) },
    { label: '平均耗时', value: avgDuration },
  ]

  const statusColor: Record<string, string> = {
    queued: 'text-gray-500',
    running: 'text-blue-500',
    succeeded: 'text-green-600',
    failed: 'text-red-500',
    cancelled: 'text-gray-400',
    timeout: 'text-orange-500',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/tasks/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">新建任务</Link>
        <Link href="/tasks?status=failed" className="px-4 py-2 bg-white border border-gray-200 text-sm rounded hover:bg-gray-50">查看失败</Link>
        <Link href="/reports" className="px-4 py-2 bg-white border border-gray-200 text-sm rounded hover:bg-gray-50">查看报告</Link>
        <Link href="/ai" className="px-4 py-2 bg-white border border-gray-200 text-sm rounded hover:bg-gray-50">AI 助手</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium">最近任务</div>
        {!recentTasks?.length ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">暂无任务</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">套件</th>
                <th className="px-4 py-3 font-medium">环境</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((t: any) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">{t.projects?.name ?? '-'}</td>
                  <td className="px-4 py-3">{t.test_suites?.name ?? '-'}</td>
                  <td className="px-4 py-3">{t.environment}</td>
                  <td className={`px-4 py-3 font-medium ${statusColor[t.status] ?? ''}`}>{t.status}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
