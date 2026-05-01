'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Suite { id: string; name: string; project_id: string }
interface Project { id: string; name: string; test_suites: Suite[] }
interface Build { id: string; version: string; build_number: string | null; platform: string; project_id: string }

const selectCls = "w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-500 disabled:opacity-40"
const selectStyle = { background: '#0A0F1E', border: '1px solid var(--border)' }

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
    <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {[
        { label: '项目', content: (
          <select className={selectCls} style={selectStyle} value={projectId}
            onChange={e => { setProjectId(e.target.value); setSuiteId(''); setBuildId('') }} required>
            <option value="" disabled style={{ background: '#111827' }}>选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#111827' }}>{p.name}</option>)}
          </select>
        )},
        { label: '测试套件', content: (
          <select className={selectCls} style={selectStyle} value={suiteId}
            onChange={e => setSuiteId(e.target.value)} required disabled={!projectId}>
            <option value="" disabled style={{ background: '#111827' }}>选择套件</option>
            {suites.map(s => <option key={s.id} value={s.id} style={{ background: '#111827' }}>{s.name}</option>)}
          </select>
        )},
        { label: '环境', content: (
          <select className={selectCls} style={selectStyle} value={env} onChange={e => setEnv(e.target.value)}>
            {['dev', 'staging', 'prod'].map(e => <option key={e} value={e} style={{ background: '#111827' }}>{e}</option>)}
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
          <select className={selectCls} style={selectStyle} value={buildId} onChange={e => setBuildId(e.target.value)}>
            <option value="" style={{ background: '#111827' }}>不指定</option>
            {projectBuilds.map(b => <option key={b.id} value={b.id} style={{ background: '#111827' }}>{b.platform} {b.version} {b.build_number ? `(${b.build_number})` : ''}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: '#2A0F0F' }}>{error}</p>}
      <button type="submit"
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
        创建任务
      </button>
    </form>
  )
}
