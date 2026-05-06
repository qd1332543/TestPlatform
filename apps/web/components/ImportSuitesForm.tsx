'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportSuitesForm({ projectId }: { projectId: string }) {
  const [yml, setYml] = useState('')
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState<'paste' | 'file'>('paste')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setYml(ev.target?.result as string); setTab('paste') }
    reader.readAsText(file)
  }

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
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm font-semibold text-white">导入测试套件</span>
        <div className="flex gap-1">
          {(['paste', 'file'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={tab === t
                ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }
                : { background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }>
              {t === 'paste' ? '粘贴内容' : '上传文件'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-3">
        {tab === 'file' ? (
          <div
            className="flex flex-col items-center justify-center h-36 rounded-lg cursor-pointer transition-colors"
            style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => { setYml(ev.target?.result as string); setTab('paste') }; r.readAsText(f) } }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-40">
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 24h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-sm">点击或拖拽上传 .yml 文件</p>
            <input ref={fileRef} type="file" accept=".yml,.yaml" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <textarea
            className="w-full rounded-lg px-3 py-2.5 text-xs font-mono h-36 resize-none outline-none"
            style={{ background: '#0A0F1E', border: '1px solid var(--border)', color: '#94A3B8', caretColor: '#3B82F6' }}
            placeholder="粘贴 meteortest.yml 内容..."
            value={yml}
            onChange={e => setYml(e.target.value)}
          />
        )}
        <div className="flex items-center gap-3">
          <button onClick={handleImport} disabled={!yml.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
            导入
          </button>
          {status && <span className="text-sm" style={{ color: status.startsWith('✓') ? '#22C55E' : '#EF4444' }}>{status}</span>}
        </div>
      </div>
    </div>
  )
}
