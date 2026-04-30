'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Suite { id: string; name: string; project_id: string }
interface Project { id: string; name: string; test_suites: Suite[] }
interface Build { id: string; version: string; build_number: string | null; platform: string; project_id: string }

const selectCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, suite_id: suiteId, environment: env, app_build_id: buildId || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '创建失败'); return }
    router.push('/tasks')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">项目</label>
        <select className={selectCls} value={projectId}
          onChange={e => { setProjectId(e.target.value); setSuiteId(''); setBuildId('') }} required>
          <option value="" disabled>选择项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">测试套件</label>
        <select className={selectCls} value={suiteId}
          onChange={e => setSuiteId(e.target.value)} required disabled={!projectId}>
          <option value="" disabled>选择套件</option>
          {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">环境</label>
        <select className={selectCls} value={env} onChange={e => setEnv(e.target.value)}>
          {['dev', 'staging', 'prod'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {projectBuilds.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">构建产物（可选）</label>
          <select className={selectCls} value={buildId} onChange={e => setBuildId(e.target.value)}>
            <option value="">不指定</option>
            {projectBuilds.map(b => <option key={b.id} value={b.id}>{b.platform} {b.version} {b.build_number ? `(${b.build_number})` : ''}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <button type="submit" className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium transition-colors">
        创建任务
      </button>
    </form>
  )
}
