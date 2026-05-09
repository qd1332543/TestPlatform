import { createClient } from '@/lib/supabase/server'
import AgentSupervisor from '@/components/AgentSupervisor'

const statusStyle: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  online:  { bg: '#0D2818', color: '#22C55E', dot: '#22C55E', label: '在线' },
  offline: { bg: '#1a2438', color: '#64748B', dot: '#475569', label: '离线' },
  busy:    { bg: '#2A1A0A', color: '#F97316', dot: '#F97316', label: '忙碌' },
}

export default async function ExecutorsPage() {
  const supabase = await createClient()
  const { data: executors } = await supabase
    .from('executors').select('id, name, type, status, capabilities, last_heartbeat_at')
    .order('status')

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">执行器</h1>
        <p className="page-subtitle">启动 Local Agent，管理自动化测试执行节点</p>
      </div>
      <AgentSupervisor />
      <div className="data-panel rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['名称', '类型', '状态', '能力标签', '最近心跳'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!executors?.length ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>暂无执行器</td></tr>
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
                      {s.label}
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
                    {e.last_heartbeat_at ? new Date(e.last_heartbeat_at).toLocaleString('zh-CN') : '-'}
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
