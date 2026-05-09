'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ProjectForm = { key: string; name: string; repo_url: string; description: string }

const inputCls = "field-input px-3 py-2.5 text-sm"

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
    <div className="space-y-6 w-full max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/projects" className="hover:text-white transition-colors">项目中心</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>新建项目</span>
          </div>
          <h1 className="text-2xl font-bold text-white">新建项目</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>填写项目基本信息，后续可导入测试套件和构建产物。</p>
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
            {loading ? '创建中...' : '创建项目'}
          </button>
        </form>

        <aside className="data-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">填写建议</div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              项目标识建议使用稳定、短小、可读的英文 key。仓库地址和描述不是强制项，但补全后更利于 AI 助手理解项目上下文。
            </p>
          </div>
          <div className="panel-inner rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>后续流程</div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>1. 导入 test-platform.yml</div>
              <div>2. 登记构建产物</div>
              <div>3. 创建测试任务</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
