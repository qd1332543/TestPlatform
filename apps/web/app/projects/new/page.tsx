'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProjectForm = { key: string; name: string; repo_url: string; description: string }

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"

const fields: { key: keyof ProjectForm; label: string; placeholder: string; required?: boolean }[] = [
  { key: 'name', label: '项目名称', placeholder: '云鹿商城', required: true },
  { key: 'key', label: '项目标识', placeholder: 'yunlu-ios', required: true },
  { key: 'repo_url', label: '仓库地址', placeholder: 'https://github.com/...' },
  { key: 'description', label: '描述', placeholder: '可选' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState<ProjectForm>({ key: '', name: '', repo_url: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? '创建失败'); return }
    router.push('/projects')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">新建项目</h1>
        <p className="text-sm text-gray-400 mt-1">填写项目基本信息</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        {fields.map(({ key, label, placeholder, required }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
            <input
              className={inputCls}
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              required={required}
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors">
          {loading ? '创建中...' : '创建项目'}
        </button>
      </form>
    </div>
  )
}
