'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/lib/useLocale'

type ProjectForm = { key: string; name: string; repo_url: string; description: string }

const inputCls = "field-input px-3 py-2.5 text-sm"

export default function NewProjectPage() {
  const { dictionary: t } = useLocale()
  const router = useRouter()
  const [form, setForm] = useState<ProjectForm>({ key: '', name: '', repo_url: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? t.forms.createFailed); return }
    router.push('/projects')
  }

  const fields: { key: keyof ProjectForm; label: string; placeholder: string; required?: boolean }[] = [
    { key: 'name', label: t.forms.projectName, placeholder: t.forms.placeholderProjectName, required: true },
    { key: 'key', label: t.forms.projectKey, placeholder: t.forms.placeholderProjectKey, required: true },
    { key: 'repo_url', label: t.forms.repoUrl, placeholder: t.forms.placeholderRepoUrl },
    { key: 'description', label: t.forms.description, placeholder: t.forms.placeholderOptional },
  ]

  return (
    <div className="space-y-6 w-full max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/projects" className="hover:text-white transition-colors">{t.pages.projects.title}</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{t.pages.newProject.breadcrumb}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t.pages.newProject.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.pages.newProject.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="data-panel rounded-xl p-6 space-y-5">
          {fields.map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <input
                className={inputCls}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={required}
              />
            </div>
          ))}
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#FCA5A5', background: '#2A0F0F', border: '1px solid #7F1D1D' }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="primary-action w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
            {loading ? t.forms.creating : t.forms.createProject}
          </button>
        </form>

        <aside className="data-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">{t.pages.newProject.guidanceTitle}</div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.pages.newProject.guidance}
            </p>
          </div>
          <div className="panel-inner rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.pages.newProject.flowTitle}</div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t.pages.newProject.flow.map((item, index) => <div key={item}>{index + 1}. {item}</div>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
