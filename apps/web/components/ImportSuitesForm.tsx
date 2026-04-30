'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportSuitesForm({ projectId }: { projectId: string }) {
  const [yml, setYml] = useState('')
  const [status, setStatus] = useState('')
  const router = useRouter()

  async function handleImport() {
    setStatus('解析中...')
    try {
      const res = await fetch('/api/projects/import-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yml }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus(`错误：${data.error}`); return }
      setStatus(`✓ 成功导入 ${data.imported} 个套件`)
      setYml('')
      router.refresh()
    } catch {
      setStatus('请求失败')
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm font-semibold text-white">从 test-platform.yml 导入套件</span>
      </div>
      <div className="p-5 space-y-3">
        <textarea
          className="w-full rounded-lg px-3 py-2.5 text-xs font-mono h-36 resize-none outline-none transition-colors"
          style={{ background: '#0A0F1E', border: '1px solid var(--border)', color: '#94A3B8', caretColor: '#3B82F6' }}
          placeholder="粘贴 test-platform.yml 内容..."
          value={yml}
          onChange={e => setYml(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button onClick={handleImport} disabled={!yml.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
            导入
          </button>
          {status && (
            <span className="text-sm" style={{ color: status.startsWith('✓') ? '#22C55E' : '#EF4444' }}>{status}</span>
          )}
        </div>
      </div>
    </div>
  )
}
