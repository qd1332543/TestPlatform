import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ImportSuitesForm from '@/components/ImportSuitesForm'

type TestSuiteRow = {
  id: string
  name: string
  type: string
  command: string
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('*, test_suites(*)')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Link href={`/tasks/new?project_id=${project.id}`} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          创建任务
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
        <div><span className="text-gray-500">标识：</span>{project.key}</div>
        <div><span className="text-gray-500">仓库：</span><a href={project.repo_url} className="text-blue-600 hover:underline" target="_blank">{project.repo_url}</a></div>
        {project.description && <div><span className="text-gray-500">描述：</span>{project.description}</div>}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium">测试套件</div>
        {!project.test_suites?.length ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">暂无套件</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">命令</th>
              </tr>
            </thead>
            <tbody>
              {(project.test_suites as TestSuiteRow[]).map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.type}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ImportSuitesForm projectId={project.id} />
    </div>
  )
}
