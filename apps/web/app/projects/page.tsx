import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects').select('id, key, name, repo_url, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">项目中心</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>管理测试项目与套件</p>
        </div>
        <Link href="/projects/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
          + 新建项目
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {!projects?.length ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无项目</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['名称', '标识', '仓库', '描述', '操作'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: '#0D1829', color: '#60A5FA', border: '1px solid #1E3A5F' }}>{p.key}</span>
                  </td>
                  <td className="px-5 py-3 truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>{p.repo_url || '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{p.description ?? '-'}</td>
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium transition-colors" style={{ color: '#3B82F6' }}>详情 →</Link>
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
