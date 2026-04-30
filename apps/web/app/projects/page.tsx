import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, key, name, repo_url, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">项目中心</h1>
          <p className="text-sm text-gray-400 mt-1">管理测试项目与套件</p>
        </div>
        <Link href="/projects/new" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium transition-colors">
          新建项目
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!projects?.length ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">暂无项目</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="px-5 py-3 font-medium">名称</th>
                <th className="px-5 py-3 font-medium">标识</th>
                <th className="px-5 py-3 font-medium">仓库</th>
                <th className="px-5 py-3 font-medium">描述</th>
                <th className="px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{p.key}</span></td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{p.repo_url || '-'}</td>
                  <td className="px-5 py-3 text-gray-400">{p.description ?? '-'}</td>
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">详情</Link>
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
