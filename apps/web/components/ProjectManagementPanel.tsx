'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ProjectValues = {
  key: string
  name: string
  repo_url: string
  description: string
}

type Copy = {
  title: string
  description: string
  nameLabel: string
  repoLabel: string
  descriptionLabel: string
  save: string
  saving: string
  saved: string
  saveFailed: string
  dangerTitle: string
  dangerDescription: string
  deleteAction: string
  deleting: string
  deleteConfirm: string
  deleteFailed: string
}

export default function ProjectManagementPanel({ project, copy }: { project: ProjectValues; copy: Copy }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: project.name,
    repo_url: project.repo_url ?? '',
    description: project.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${project.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || copy.saveFailed)
      setMessage(copy.saved)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="data-panel rounded-xl overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-sm font-semibold text-white">{copy.title}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{copy.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {message && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{message}</span>}
          <button type="button" onClick={save} disabled={saving || !form.name.trim()}
            className="primary-action rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3 flex-1">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{copy.nameLabel}</span>
            <input className="field-input px-3 py-2 text-sm" value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{copy.repoLabel}</span>
            <input className="field-input px-3 py-2 text-sm" value={form.repo_url}
              onChange={event => setForm(prev => ({ ...prev, repo_url: event.target.value }))} />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{copy.descriptionLabel}</span>
          <textarea className="field-input px-3 py-2 text-sm resize-none w-full" rows={3} value={form.description}
            onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} />
        </label>
      </div>
    </section>
  )
}

export function ProjectDangerZone({ projectKey, copy }: { projectKey: string; copy: Pick<Copy, 'dangerTitle' | 'dangerDescription' | 'deleteAction' | 'deleting' | 'deleteConfirm' | 'deleteFailed'> }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function deleteProject() {
    if (!window.confirm(copy.deleteConfirm)) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectKey}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || copy.deleteFailed)
      router.push('/projects')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.deleteFailed)
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 border-l-4" style={{ borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 20%, var(--bg-card))', outline: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)' }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{copy.dangerTitle}</div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{copy.dangerDescription}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {message && <span className="text-xs" style={{ color: 'var(--danger)' }}>{message}</span>}
        <button type="button" onClick={deleteProject} disabled={deleting}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{ border: '1px solid color-mix(in srgb, var(--danger) 60%, transparent)', color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
          {deleting ? copy.deleting : copy.deleteAction}
        </button>
      </div>
    </div>
  )
}
