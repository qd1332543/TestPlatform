'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/lib/useLocale'

type AgentStatus = {
  available?: boolean
  running: boolean
  started?: boolean
  pid: number | null
  logFile: string
  logTail: string
  disabledReason?: string
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
  const { dictionary: t } = useLocale()
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const readAgentStatus = useCallback(async (response: Response) => {
    const text = await response.text()
    if (!text.trim()) throw new Error(t.agent.emptyResponse)
    try {
      return JSON.parse(text) as AgentStatus
    } catch {
      throw new Error(t.agent.invalidResponse)
    }
  }, [t.agent.emptyResponse, t.agent.invalidResponse])

  const load = useCallback(async (autoStart = false) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent/status', { cache: 'no-store' })
      const data = await readAgentStatus(res)
      if (autoStart && data.available !== false && !data.running) {
        const startRes = await fetch('/api/agent/status', { method: 'POST' })
        const started = await readAgentStatus(startRes)
        setStatus(started)
      } else {
        setStatus(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.agent.checkFailed)
    } finally {
      setLoading(false)
    }
  }, [readAgentStatus, t.agent.checkFailed])

  useEffect(() => {
    queueMicrotask(() => load(shouldAutoStartAgent()))
    const timer = window.setInterval(() => load(false), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const running = status?.running
  const unavailable = status?.available === false

  return (
    <div className="data-panel rounded-xl p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.agent.console}</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: running ? 'var(--status-success-text)' : loading ? 'var(--status-warning-text)' : 'var(--status-queued-text)' }} />
            <span className="text-sm font-semibold text-white">
              {running ? t.agent.running : loading ? t.agent.checking : unavailable ? t.agent.unavailable : t.agent.stopped}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {running && status?.pid ? t.agent.runningDetail(status.pid) : unavailable ? t.agent.publicUnavailableDetail : t.agent.stoppedDetail}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || unavailable}
          className={`${running ? 'secondary-action' : 'primary-action'} px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40`}
        >
          {running ? t.agent.refresh : unavailable ? t.agent.unavailableAction : t.agent.start}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--status-failed-bg)', color: 'var(--status-failed-text)', border: '1px solid color-mix(in srgb, var(--status-failed-text) 34%, var(--border))' }}>
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
