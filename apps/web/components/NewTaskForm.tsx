'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Suite { id: string; name: string; project_id: string }
interface Project { id: string; name: string; test_suites: Suite[] }
interface Build { id: string; version: string; build_number: string | null; platform: string; project_id: string }

const selectCls = "field-input px-3 py-2.5 text-sm disabled:opacity-40"

export default function NewTaskForm({ projects, builds }: { projects: Project[], builds: Build[] }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState('')
  const [suiteId, setSuiteId] = useState('')
  const [env, setEnv] = useState('dev')
  const [buildId, setBuildId] = useState('')
  const [error, setError] = useState('')

  const suites = projects.find(p => p.id === projectId)?.test_suites ?? []
  const projectBuilds = builds.filter(b => b.project_id === projectId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, suite_id: suiteId, environment: env, app_build_id: buildId || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '创建失败'); return }
    router.push('/tasks')
  }

  return (
    <form onSubmit={handleSubmit} className="data-panel rounded-xl p-6 space-y-5">
      {[
        { label: '项目', content: (
          <select className={selectCls} value={projectId}
            onChange={e => { setProjectId(e.target.value); setSuiteId(''); setBuildId('') }} required>
            <option value="" disabled>选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )},
        { label: '测试套件', content: (
          <select className={selectCls} value={suiteId}
            onChange={e => setSuiteId(e.target.value)} required disabled={!projectId}>
            <option value="" disabled>选择套件</option>
            {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )},
        { label: '环境', content: (
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
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>构建产物（可选）</label>
          <select className={selectCls} value={buildId} onChange={e => setBuildId(e.target.value)}>
            <option value="">不指定</option>
            {projectBuilds.map(b => <option key={b.id} value={b.id}>{b.platform} {b.version} {b.build_number ? `(${b.build_number})` : ''}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: '#2A0F0F' }}>{error}</p>}
      <button type="submit"
        className="primary-action w-full py-2.5 rounded-lg text-sm font-semibold">
        创建任务
      </button>
    </form>
  )
}
