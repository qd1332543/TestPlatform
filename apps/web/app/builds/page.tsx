import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type BuildRow = {
  id: string; platform: string; version: string; build_number: string | null
  artifact_url: string; created_at: string
  projects: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

const platformStyle: Record<string, { bg: string; color: string }> = {
  ios:     { bg: '#0D1829', color: '#60A5FA' },
  android: { bg: '#0D2818', color: '#22C55E' },
  web:     { bg: '#1a1040', color: '#A78BFA' },
}

export default async function BuildsPage() {
  const supabase = await createClient()
  const { data: builds } = await supabase
    .from('app_builds').select('*, projects(name)')
    .order('created_at', { ascending: false }).limit(50)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">构建产物</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>管理应用构建版本</p>
        </div>
        <Link href="/builds/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
          + 登记构建
        </Link>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['项目', '平台', '版本', 'Build', '时间', '产物'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!builds?.length ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>暂无构建产物</td></tr>
            ) : (builds as BuildRow[]).map((b) => {
              const ps = platformStyle[b.platform?.toLowerCase()] ?? platformStyle.ios
              return (
                <tr key={b.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{relationName(b.projects) ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium uppercase" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}30` }}>{b.platform}</span>
                  </td>
                  <td className="px-5 py-3 text-white font-mono">{b.version}</td>
                  <td className="px-5 py-3 font-mono" style={{ color: 'var(--text-muted)' }}>{b.build_number ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleString('zh-CN')}</td>
                  <td className="px-5 py-3">
                    <a href={b.artifact_url} target="_blank" className="text-sm font-medium transition-colors" style={{ color: '#3B82F6' }}>下载 ↓</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
