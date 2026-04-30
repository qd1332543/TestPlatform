import { createClient } from '@/lib/supabase/server'

const statusColor: Record<string, string> = {
  online: 'text-green-600', offline: 'text-gray-400', busy: 'text-orange-500',
}

export default async function ExecutorsPage() {
  const supabase = await createClient()
  const { data: executors } = await supabase
    .from('executors')
    .select('id, name, type, status, capabilities, last_heartbeat_at')
    .order('status')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">执行器</h1>
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">能力标签</th>
              <th className="px-4 py-3 font-medium">最近心跳</th>
            </tr>
          </thead>
          <tbody>
            {!executors?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无执行器</td></tr>
            ) : executors.map(e => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.type}</td>
                <td className={`px-4 py-3 font-medium ${statusColor[e.status] ?? ''}`}>{e.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(e.capabilities as string[] | null)?.map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {e.last_heartbeat_at ? new Date(e.last_heartbeat_at).toLocaleString('zh-CN') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
