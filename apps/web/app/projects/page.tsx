import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'

export default async function ProjectsPage() {
  const t = await getDictionary()
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects').select('id, key, name, repo_url, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.pages.projects.title}</h1>
          <p className="page-subtitle">{t.pages.projects.subtitle}</p>
        </div>
        <Link href="/projects/new"
          className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
          {t.pages.projects.newAction}
        </Link>
      </div>

      <div className="data-panel rounded-xl overflow-hidden">
        {!projects?.length ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.projects.empty}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[t.common.name, t.common.key, t.common.repository, t.common.description, t.common.actions].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className="code-pill px-2 py-0.5 text-xs font-mono">{p.key}</span>
                  </td>
                  <td className="px-5 py-3 truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>{p.repo_url || '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{p.description ?? '-'}</td>
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="link-action text-sm">{t.common.detailsArrow}</Link>
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
