'use client'

import { useEffect, useState } from 'react'

type AgentStatus = {
  running: boolean
  started?: boolean
  pid: number | null
  logFile: string
  logTail: string
}

const settingsKey = 'meteortest.settings.v1'

function shouldAutoStartAgent() {
  const raw = window.localStorage.getItem(settingsKey)
  if (!raw) return true
  try {
    const settings = JSON.parse(raw) as { autoStartAgent?: boolean }
    return settings.autoStartAgent !== false
  } catch {
    return true
  }
}

export default function AgentSupervisor() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(autoStart = false) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent/status', { cache: 'no-store' })
      const data = await res.json() as AgentStatus
      if (autoStart && !data.running) {
        const startRes = await fetch('/api/agent/status', { method: 'POST' })
        const started = await startRes.json() as AgentStatus
        setStatus(started)
      } else {
        setStatus(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法检查 Agent 状态')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => load(shouldAutoStartAgent()))
    const timer = window.setInterval(() => load(false), 15000)
    return () => window.clearInterval(timer)
  }, [])

  const running = status?.running

  return (
    <div className="data-panel rounded-xl p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Local Agent 控制台</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: running ? '#22C55E' : loading ? '#F97316' : '#64748B' }} />
            <span className="text-sm font-semibold text-white">
              {running ? 'Local Agent 已启动' : loading ? '正在检查 Local Agent' : 'Local Agent 未运行'}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {running && status?.pid ? `PID ${status.pid} · 后台轮询 Supabase queued 任务` : '可在设置页控制是否进入执行器页时自动启动'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className={`${running ? 'secondary-action' : 'primary-action'} px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40`}
        >
          {running ? 'Agent 运行中 · 刷新' : '一键启动 Agent'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#2A0F0F', color: '#EF4444', border: '1px solid #7F1D1D' }}>
          {error}
        </div>
      )}

      {status?.logTail && !running && (
        <pre className="panel-inner mt-3 max-h-32 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
          {status.logTail}
        </pre>
      )}
    </div>
  )
}
