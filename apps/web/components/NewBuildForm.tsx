'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Project { id: string; name: string }

export default function NewBuildForm({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ project_id: '', platform: 'ios', version: '', build_number: '', artifact_url: '', bundle_id: '', package_name: '', git_commit: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('app_builds').insert(form)
    if (error) { setError(error.message); return }
    router.push('/builds')
  }

  const field = (label: string, key: keyof typeof form, required = false, placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}{required && ' *'}</label>
      <input
        className="field-input px-3 py-2.5 text-sm"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="data-panel rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>项目 *</label>
        <select className="field-input px-3 py-2.5 text-sm" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} required>
          <option value="">选择项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>平台 *</label>
        <select className="field-input px-3 py-2.5 text-sm" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
          {['ios', 'android', 'web'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {field('版本号', 'version', true, '1.0.0')}
      {field('Build 号', 'build_number', false, '100')}
      {field('产物 URL', 'artifact_url', true, 'https://...')}
      {field('Bundle ID', 'bundle_id', false, 'com.example.app')}
      {field('Package Name', 'package_name', false, 'com.example.app')}
      {field('Git Commit', 'git_commit', false, 'abc1234')}
      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#FCA5A5', background: '#2A0F0F', border: '1px solid #7F1D1D' }}>{error}</p>}
      <button type="submit" className="primary-action w-full px-4 py-2.5 rounded-lg text-sm font-semibold">登记构建</button>
    </form>
  )
}
