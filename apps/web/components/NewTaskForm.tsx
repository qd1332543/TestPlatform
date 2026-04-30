'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Suite { id: string; name: string; project_id: string }
interface Project { id: string; name: string; test_suites: Suite[] }
interface Build { id: string; version: string; build_number: string | null; platform: string; project_id: string }

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
    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      suite_id: suiteId,
      environment: env,
      status: 'queued',
      app_build_id: buildId || null,
    })
    if (error) { setError(error.message); return }
    router.push('/tasks')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目</label>
        <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm" value={projectId}
          onChange={e => { setProjectId(e.target.value); setSuiteId(''); setBuildId('') }} required>
          <option value="">选择项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">测试套件</label>
        <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm" value={suiteId}
          onChange={e => setSuiteId(e.target.value)} required disabled={!projectId}>
          <option value="">选择套件</option>
          {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">环境</label>
        <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm" value={env} onChange={e => setEnv(e.target.value)}>
          {['dev', 'staging', 'prod'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {projectBuilds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">构建产物（可选）</label>
          <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm" value={buildId} onChange={e => setBuildId(e.target.value)}>
            <option value="">不指定</option>
            {projectBuilds.map(b => <option key={b.id} value={b.id}>{b.platform} {b.version} {b.build_number ? `(${b.build_number})` : ''}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">创建任务</button>
    </form>
  )
}
