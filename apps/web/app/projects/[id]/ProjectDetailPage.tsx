import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ImportSuitesForm from '@/components/ImportSuitesForm'
import ProjectManagementPanel, { ProjectDangerZone } from '@/components/ProjectManagementPanel'
import { getDictionary } from '@/lib/i18n'
import { isLocalDemo, demoProjects } from '@/lib/localDemo'
import { isUuid } from '@/lib/viewModels/displayRefs'
import { testScopeDisplayName } from '@/lib/viewModels/testScopes'

type TestSuiteRow = { suite_key: string; name: string; type: string; command: string }
type ProjectView = {
  key: string
  name: string
  repo_url?: string | null
  description?: string | null
  test_suites?: TestSuiteRow[] | null
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeRef } = await params
  const t = await getDictionary()

  let project: ProjectView | null = null

  if (isLocalDemo()) {
    const demoProject = demoProjects.find(p => p.key === routeRef || p.id === routeRef)
    project = demoProject
      ? {
          key: demoProject.key,
          name: demoProject.name,
          repo_url: demoProject.repo_url,
          description: demoProject.description,
          test_suites: demoProject.test_suites.map(({ suite_key, name, type, command }) => ({ suite_key, name, type, command })),
        }
      : null
  } else {
    const supabase = await createClient()
    const query = supabase
      .from('projects').select('key, name, repo_url, description, created_at, test_suites(suite_key, name, type, command)')
    const { data } = isUuid(routeRef)
      ? await query.eq('id', routeRef).single()
      : await query.eq('key', routeRef).single()
    project = data
  }

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
        <Link href={`/tasks/new?project_key=${project.key}`}
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.projectDetail.createTask}
        </Link>
      </div>

      {/* 项目信息：横向卡片 */}
      <div className="data-panel rounded-xl p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.identifier}</span>
            <span className="code-pill px-2 py-0.5 text-xs font-mono">{project.key}</span>
          </div>
          {project.repo_url && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.repository}</span>
              <a href={project.repo_url} target="_blank" className="link-action text-sm">{project.repo_url}</a>
            </div>
          )}
          {project.description && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.projectDetail.description}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* 测试套件：全宽 */}
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
                <tr key={s.suite_key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{testScopeDisplayName(s, t.common.testScopes)}</td>
                  <td className="px-5 py-3"><span className="meta-pill px-2 py-0.5 text-xs">{s.type}</span></td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 底部两列等高 */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <ImportSuitesForm projectKey={project.key} />
        <ProjectManagementPanel
          project={{
            key: project.key,
            name: project.name,
            repo_url: project.repo_url ?? '',
            description: project.description ?? '',
          }}
          copy={t.projectDetail.management}
        />
      </div>

      {/* 危险区：全宽 */}
      <ProjectDangerZone projectKey={project.key} copy={t.projectDetail.management} />
    </div>
  )
}
