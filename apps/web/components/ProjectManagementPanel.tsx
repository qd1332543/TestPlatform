'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ProjectValues = {
  id: string
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
  const [deleting, setDeleting] = useState(false)
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
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject() {
    if (!window.confirm(copy.deleteConfirm)) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
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
    <section className="data-panel rounded-xl p-5 space-y-5">
      <div>
        <h2 className="section-title">{copy.title}</h2>
        <p className="section-subtitle mt-1">{copy.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{copy.nameLabel}</span>
          <input
            className="field-input px-3 py-2.5 text-sm"
            value={form.name}
            onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{copy.repoLabel}</span>
          <input
            className="field-input px-3 py-2.5 text-sm"
            value={form.repo_url}
            onChange={event => setForm(prev => ({ ...prev, repo_url: event.target.value }))}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{copy.descriptionLabel}</span>
        <textarea
          className="field-input min-h-24 px-3 py-2.5 text-sm"
          value={form.description}
          onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || deleting || !form.name.trim()}
          className="primary-action rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
        {message && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</span>}
      </div>

      <div className="rounded-lg p-4" style={{ border: '1px solid var(--status-failed-bg)', background: 'var(--surface-soft)' }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--status-failed-text)' }}>{copy.dangerTitle}</div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{copy.dangerDescription}</p>
        <button
          type="button"
          onClick={deleteProject}
          disabled={saving || deleting}
          className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{ border: '1px solid var(--status-failed-bg)', color: 'var(--status-failed-text)', background: 'transparent' }}
        >
          {deleting ? copy.deleting : copy.deleteAction}
        </button>
      </div>
    </section>
  )
}
