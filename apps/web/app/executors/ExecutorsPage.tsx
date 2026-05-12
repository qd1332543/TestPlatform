import { createClient } from '@/lib/supabase/server'
import AgentSupervisor from '@/components/AgentSupervisor'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { demoExecutors, isLocalDemo } from '@/lib/localDemo'

const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  online:  { bg: 'var(--status-running-bg)', color: 'var(--status-running-text)', dot: 'var(--status-running-text)' },
  offline: { bg: 'var(--status-queued-bg)', color: 'var(--status-queued-text)', dot: 'var(--status-queued-text)' },
  busy:    { bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)', dot: 'var(--status-warning-text)' },
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
        <div className="desktop-table overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
                    <span className={`status-badge status-${e.status} gap-1.5 px-2 py-0.5`} style={{ background: s.bg, color: s.color }}>
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
        <div className="mobile-card-list p-3">
          {!executors?.length ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.pages.executors.empty}</div>
          ) : executors.map(e => {
            const s = statusStyle[e.status] ?? statusStyle.offline
            return (
              <div key={e.id} className="rounded-xl p-4" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.name}</div>
                    <div className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{e.type}</div>
                  </div>
                  <span className={`status-badge status-${e.status} shrink-0 gap-1.5 px-2 py-0.5`} style={{ background: s.bg, color: s.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                    {t.status[e.status as keyof typeof t.status] ?? e.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(e.capabilities as string[] | null)?.map(c => (
                    <span key={c} className="meta-pill px-2 py-0.5 text-xs">{c}</span>
                  ))}
                </div>
                <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.common.heartbeat}: {formatDateTime(e.last_heartbeat_at, locale)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
