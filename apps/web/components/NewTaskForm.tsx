'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/useLocale'

interface Suite { suite_key: string; name: string }
interface Project { key: string; name: string; test_suites: Suite[] }
interface Build { display_id: string; version: string; build_number: string | null; platform: string; project_key: string }

const selectCls = "field-input px-3 py-2.5 text-sm disabled:opacity-40"

export default function NewTaskForm({ projects, builds }: { projects: Project[], builds: Build[] }) {
  const { dictionary: t } = useLocale()
  const router = useRouter()
  const [projectKey, setProjectKey] = useState('')
  const [suiteKey, setSuiteKey] = useState('')
  const [env, setEnv] = useState('dev')
  const [buildRef, setBuildRef] = useState('')
  const [error, setError] = useState('')

  const suites = projects.find(p => p.key === projectKey)?.test_suites ?? []
  const projectBuilds = builds.filter(b => b.project_key === projectKey)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_key: projectKey, suite_key: suiteKey, environment: env, app_build_ref: buildRef || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? t.forms.createFailed); return }
    router.push(data.task_ref ? `/tasks/${data.task_ref}` : '/tasks')
  }

  return (
    <form onSubmit={handleSubmit} className="data-panel rounded-xl p-6 space-y-5">
      {[
        { label: t.common.project, content: (
          <select className={selectCls} value={projectKey}
            onChange={e => { setProjectKey(e.target.value); setSuiteKey(''); setBuildRef('') }} required>
            <option value="" disabled>{t.forms.selectProject}</option>
            {projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        )},
        { label: t.common.suite, content: (
          <select className={selectCls} value={suiteKey}
            onChange={e => setSuiteKey(e.target.value)} required disabled={!projectKey}>
            <option value="" disabled>{t.forms.selectSuite}</option>
            {suites.map(s => <option key={s.suite_key} value={s.suite_key}>{s.name}</option>)}
          </select>
        )},
        { label: t.common.environment, content: (
          <select className={selectCls} value={env} onChange={e => setEnv(e.target.value)}>
            {['dev', 'staging', 'prod'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )},
      ].map(({ label, content }) => (
        <div key={label}>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
          {content}
        </div>
      ))}
      {projectBuilds.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.forms.appBuildOptional}</label>
          <select className={selectCls} value={buildRef} onChange={e => setBuildRef(e.target.value)}>
            <option value="">{t.common.none}</option>
            {projectBuilds.map(b => <option key={b.display_id} value={b.display_id}>{b.platform} {b.version} {b.build_number ? `(${b.build_number})` : ''}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--status-failed-text)', background: 'var(--status-failed-bg)', border: '1px solid color-mix(in srgb, var(--status-failed-text) 34%, var(--border))' }}>{error}</p>}
      <button type="submit"
        className="primary-action w-full py-2.5 rounded-lg text-sm font-semibold">
        {t.forms.createTask}
      </button>
    </form>
  )
}
