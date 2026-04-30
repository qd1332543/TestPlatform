'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProjectForm = { key: string; name: string; repo_url: string; description: string }

const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-blue-500"
const inputStyle = { background: '#0A0F1E', border: '1px solid var(--border)' }

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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? '创建失败'); return }
    router.push('/projects')
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">新建项目</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>填写项目基本信息</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {fields.map(({ key, label, placeholder, required }) => (
          <div key={key}>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              required={required}
            />
          </div>
        ))}
        {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: '#2A0F0F' }}>{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
          {loading ? '创建中...' : '创建项目'}
        </button>
      </form>
    </div>
  )
}
