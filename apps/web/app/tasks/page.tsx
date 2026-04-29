import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusMap: Record<string, string> = {
  queued: '排队中', running: '执行中', succeeded: '成功',
  failed: '失败', cancelled: '已取消', timeout: '超时',
}
const statusColor: Record<string, string> = {
  queued: 'text-gray-500', running: 'text-blue-500', succeeded: 'text-green-600',
  failed: 'text-red-500', cancelled: 'text-gray-400', timeout: 'text-orange-500',
}

export default async function TasksPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name), executors(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (searchParams.status) query = query.eq('status', searchParams.status)

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">任务中心</h1>
        <Link href="/tasks/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">新建任务</Link>
      </div>
      <div className="flex gap-2 text-sm">
        {filters.map(f => (
          <Link
            key={f.value}
            href={f.value ? `/tasks?status=${f.value}` : '/tasks'}
            className={`px-3 py-1 rounded border ${searchParams.status === f.value || (!searchParams.status && !f.value) ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
          >{f.label}</Link>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">项目</th>
              <th className="px-4 py-3 font-medium">套件</th>
              <th className="px-4 py-3 font-medium">环境</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">执行器</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {!tasks?.length ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无任务</td></tr>
            ) : tasks.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">{t.projects?.name ?? '-'}</td>
                <td className="px-4 py-3">{t.test_suites?.name ?? '-'}</td>
                <td className="px-4 py-3">{t.environment}</td>
                <td className={`px-4 py-3 font-medium ${statusColor[t.status]}`}>{statusMap[t.status] ?? t.status}</td>
                <td className="px-4 py-3 text-gray-400">{t.executors?.name ?? '-'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3"><Link href={`/tasks/${t.id}`} className="text-blue-600 hover:underline">详情</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
