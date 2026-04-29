import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, key, name, repo_url, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">项目中心</h1>
        <Link href="/projects/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          新建项目
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        {!projects?.length ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">暂无项目</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">标识</th>
                <th className="px-4 py-3 font-medium">仓库</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.key}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{p.repo_url}</td>
                  <td className="px-4 py-3 text-gray-400">{p.description ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">详情</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
