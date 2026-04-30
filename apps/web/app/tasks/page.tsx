import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

type TaskRow = {
  id: string
  status: string
  environment: string
  created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
  executors: { name: string } | { name: string }[] | null
}

function relationName(relation: { name: string } | { name: string }[] | null) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name), executors(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  const { data: tasks } = await query

  const filters = [
    { label: '全部', value: '' },
    { label: '排队中', value: 'queued' },
    { label: '执行中', value: 'running' },
    { label: '成功', value: 'succeeded' },
    { label: '失败', value: 'failed' },
    { label: '超时', value: 'timeout' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">任务中心</h1>
          <p className="text-sm text-gray-400 mt-1">查看和管理测试任务</p>
        </div>
        <Link href="/tasks/new" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium transition-colors">新建任务</Link>
      </div>

      <div className="flex gap-2">
        {filters.map(f => (
          <Link
            key={f.value}
            href={f.value ? `/tasks?status=${f.value}` : '/tasks'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === f.value || (!status && !f.value)
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >{f.label}</Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
              <th className="px-5 py-3 font-medium">项目</th>
              <th className="px-5 py-3 font-medium">套件</th>
              <th className="px-5 py-3 font-medium">环境</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">执行器</th>
              <th className="px-5 py-3 font-medium">时间</th>
              <th className="px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {!tasks?.length ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">暂无任务</td></tr>
            ) : (tasks as TaskRow[]).map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{relationName(t.projects) ?? '-'}</td>
                <td className="px-5 py-3 text-gray-600">{relationName(t.test_suites) ?? '-'}</td>
                <td className="px-5 py-3 text-gray-500">{t.environment}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statusMap[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400">{relationName(t.executors) ?? '-'}</td>
                <td className="px-5 py-3 text-gray-400">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-5 py-3">
                  <Link href={`/tasks/${t.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">详情</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
