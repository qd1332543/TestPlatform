'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState({ key: '', name: '', repo_url: '', description: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('projects').insert(form)
    if (error) { setError(error.message); return }
    router.push('/projects')
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">新建项目</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {[
          { key: 'name', label: '项目名称', placeholder: '云鹿商城' },
          { key: 'key', label: '项目标识', placeholder: 'yunlu-ios' },
          { key: 'repo_url', label: '仓库地址', placeholder: 'https://github.com/...' },
          { key: 'description', label: '描述', placeholder: '可选' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              required={key !== 'description'}
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          创建
        </button>
      </form>
    </div>
  )
}
