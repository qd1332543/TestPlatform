import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'
import { demoProjects, isLocalDemo } from '@/lib/localDemo'

type ProjectRow = {
  id: string
  key: string
  name: string
  repo_url: string | null
  description: string | null
  test_suites?: { id: string }[] | null
}

export default async function ProjectsPage() {
  const t = await getDictionary()
  const supabase = isLocalDemo() ? null : await createClient()
  const { data: projects } = supabase
    ? await supabase
      .from('projects').select('id, key, name, repo_url, description, created_at, test_suites(id)')
      .order('created_at', { ascending: false })
    : { data: demoProjects }
  const projectRows = (projects ?? []) as ProjectRow[]
  const suiteCount = projectRows.reduce((sum, project) => sum + (project.test_suites?.length ?? 0), 0)
  const repositoryCount = projectRows.filter(project => project.repo_url).length

  return (
    <div className="page-shell space-y-6">
      <div className="console-hero rounded-xl p-5 page-header">
        <div>
          <h1 className="page-title">{t.pages.projects.title}</h1>
          <p className="page-subtitle">{t.pages.projects.subtitle}</p>
        </div>
        <Link href="/projects/new"
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.pages.projects.newAction}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t.common.projects, value: projectRows.length },
          { label: t.projectDetail.suites, value: suiteCount },
          { label: t.common.repository, value: repositoryCount },
        ].map(item => (
          <div key={item.label} className="metric-card rounded-xl p-4">
            <div className="metric-label">{item.label}</div>
            <div className="metric-value mt-3">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {!projectRows.length ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.projects.empty}</div>
        ) : (
          projectRows.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="resource-card rounded-xl p-5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="section-title truncate">{project.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="code-pill px-2 py-0.5 text-xs font-mono">{project.key}</span>
                    <span className="meta-pill px-2 py-0.5 text-xs">{project.test_suites?.length ?? 0} {t.projectDetail.suites}</span>
                  </div>
                </div>
                <span className="link-action text-sm shrink-0">{t.common.detailsArrow}</span>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
                {project.description || t.common.noData}
              </p>
              <div className="mt-4 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {project.repo_url || t.common.repository}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
