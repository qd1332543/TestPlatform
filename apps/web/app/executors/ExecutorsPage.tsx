import { createClient } from '@/lib/supabase/server'
import AgentSupervisor from '@/components/AgentSupervisor'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { demoExecutors, isLocalDemo } from '@/lib/localDemo'

const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  online:  { bg: '#0D2818', color: '#22C55E', dot: '#22C55E' },
  offline: { bg: '#1a2438', color: '#64748B', dot: '#475569' },
  busy:    { bg: '#2A1A0A', color: '#F97316', dot: '#F97316' },
}

type ExecutorRow = {
  id: string
  name: string
  type: string
  status: string
  capabilities: string[] | null
  last_heartbeat_at: string | null
}

export default async function ExecutorsPage() {
  const locale = await getLocale()
  const t = await getDictionary()
  const isPublicPreview = process.env.METEORTEST_PUBLIC_PREVIEW === '1'
  const skipSupabaseForSmoke = process.env.METEORTEST_SMOKE_NO_SUPABASE === '1'
  let executors: ExecutorRow[] = []

  if (isLocalDemo()) {
    executors = demoExecutors
  } else if (!skipSupabaseForSmoke) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('executors')
        .select('id, name, type, status, capabilities, last_heartbeat_at')
        .order('status')
    executors = (data ?? []) as ExecutorRow[]
  }

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">{t.pages.executors.title}</h1>
        <p className="page-subtitle">{t.pages.executors.subtitle}</p>
      </div>
      {isPublicPreview ? (
        <div className="data-panel rounded-xl p-4" style={{ borderColor: 'var(--accent)' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            {t.agent.unavailable}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t.agent.publicUnavailableDetail}
          </p>
        </div>
      ) : null}
      <AgentSupervisor />
      <div className="data-panel rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t.common.name, t.common.type, t.common.status, t.common.capabilities, t.common.heartbeat].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!executors?.length ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t.pages.executors.empty}</td></tr>
            ) : executors.map(e => {
              const s = statusStyle[e.status] ?? statusStyle.offline
              return (
                <tr key={e.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{e.name}</td>
                  <td className="px-5 py-3">
                    <span className="code-pill px-2 py-0.5 text-xs font-mono">{e.type}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`status-badge status-${e.status} gap-1.5 px-2 py-0.5`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      {t.status[e.status as keyof typeof t.status] ?? e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(e.capabilities as string[] | null)?.map(c => (
                        <span key={c} className="meta-pill px-2 py-0.5 text-xs">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(e.last_heartbeat_at, locale)}
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
