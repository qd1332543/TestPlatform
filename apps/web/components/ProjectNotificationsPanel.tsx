'use client'

import { useState } from 'react'

type NotificationValues = {
  id: string
  webhook_url: string
  notify_on_failure: boolean
  notify_on_recovery: boolean
}

type Copy = {
  title: string
  description: string
  webhookUrl: string
  webhookPlaceholder: string
  notifyOnFailure: string
  notifyOnFailureDesc: string
  notifyOnRecovery: string
  notifyOnRecoveryDesc: string
  save: string
  saving: string
  saved: string
  saveFailed: string
}

export default function ProjectNotificationsPanel({ project, copy }: { project: NotificationValues; copy: Copy }) {
  const [form, setForm] = useState({
    webhook_url: project.webhook_url,
    notify_on_failure: project.notify_on_failure,
    notify_on_recovery: project.notify_on_recovery,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || copy.saveFailed)
      setMessage(copy.saved)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="data-panel rounded-xl p-5 space-y-5">
      <div>
        <h2 className="section-title">{copy.title}</h2>
        <p className="section-subtitle mt-1">{copy.description}</p>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{copy.webhookUrl}</span>
        <input
          className="field-input px-3 py-2.5 text-sm"
          placeholder={copy.webhookPlaceholder}
          value={form.webhook_url}
          onChange={e => setForm(prev => ({ ...prev, webhook_url: e.target.value }))}
        />
      </label>

      <div className="space-y-3">
        {([
          { key: 'notify_on_failure', label: copy.notifyOnFailure, desc: copy.notifyOnFailureDesc },
          { key: 'notify_on_recovery', label: copy.notifyOnRecovery, desc: copy.notifyOnRecoveryDesc },
        ] as const).map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.checked }))}
              />
              <div
                className="w-9 h-5 rounded-full transition-colors"
                style={{ background: form[key] ? 'var(--control-on-bg)' : 'var(--control-off-bg)', border: form[key] ? '1px solid var(--control-on-border)' : '1px solid var(--border)' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: form[key] ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="primary-action rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
        {message && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</span>}
      </div>
    </section>
  )
}
