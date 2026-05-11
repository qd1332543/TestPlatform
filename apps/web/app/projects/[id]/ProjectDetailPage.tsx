import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ImportSuitesForm from '@/components/ImportSuitesForm'
import ProjectManagementPanel from '@/components/ProjectManagementPanel'
import { getDictionary } from '@/lib/i18n'

type TestSuiteRow = { id: string; name: string; type: string; command: string }

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getDictionary()
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects').select('*, test_suites(*)').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/projects" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>{t.pages.projects.title}</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        </div>
        <Link href={`/tasks/new?project_id=${project.id}`}
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.projectDetail.createTask}
        </Link>
      </div>

      <div className="data-panel rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.identifier}</span>
          <span className="code-pill px-2 py-0.5 text-xs font-mono">{project.key}</span>
        </div>
        {project.repo_url && (
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.repository}</span>
            <a href={project.repo_url} target="_blank" className="link-action text-sm">{project.repo_url}</a>
          </div>
        )}
        {project.description && (
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.description}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.description}</span>
          </div>
        )}
      </div>

      <div className="data-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold text-white">{t.projectDetail.suites}</span>
        </div>
        {!project.test_suites?.length ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.emptySuites}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[t.common.name, t.common.type, t.common.command].map(h => (
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

      <ProjectManagementPanel
        project={{
          id: project.id,
          name: project.name,
          repo_url: project.repo_url ?? '',
          description: project.description ?? '',
        }}
        copy={t.projectDetail.management}
      />
    </div>
  )
}
