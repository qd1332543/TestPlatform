import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ImportSuitesForm from '@/components/ImportSuitesForm'

type TestSuiteRow = { id: string; name: string; type: string; command: string }

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects').select('*, test_suites(*)').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/projects" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>项目中心</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        </div>
        <Link href={`/tasks/new?project_id=${project.id}`}
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          + 创建任务
        </Link>
      </div>

      <div className="data-panel rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>标识</span>
          <span className="code-pill px-2 py-0.5 text-xs font-mono">{project.key}</span>
        </div>
        {project.repo_url && (
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>仓库</span>
            <a href={project.repo_url} target="_blank" className="link-action text-sm">{project.repo_url}</a>
          </div>
        )}
        {project.description && (
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>描述</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.description}</span>
          </div>
        )}
      </div>

      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold text-white">测试套件</span>
        </div>
        {!project.test_suites?.length ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无套件，请导入</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['名称', '类型', '命令'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(project.test_suites as TestSuiteRow[]).map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className="meta-pill px-2 py-0.5 text-xs">{s.type}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.command}</td>
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
