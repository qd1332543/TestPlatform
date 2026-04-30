import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function BuildsPage() {
  const supabase = await createClient()
  const { data: builds } = await supabase
    .from('app_builds')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">构建产物</h1>
        <Link href="/builds/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">登记构建</Link>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">项目</th>
              <th className="px-4 py-3 font-medium">平台</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">Build</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">产物</th>
            </tr>
          </thead>
          <tbody>
            {!builds?.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无构建产物</td></tr>
            ) : builds.map((b: any) => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">{b.projects?.name ?? '-'}</td>
                <td className="px-4 py-3">{b.platform}</td>
                <td className="px-4 py-3">{b.version}</td>
                <td className="px-4 py-3 text-gray-400">{b.build_number ?? '-'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(b.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3">
                  <a href={b.artifact_url} className="text-blue-600 hover:underline" target="_blank">下载</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
