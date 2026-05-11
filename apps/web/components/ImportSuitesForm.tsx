'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/useLocale'

export default function ImportSuitesForm({ projectId }: { projectId: string }) {
  const { dictionary: t } = useLocale()
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
    setStatus(t.forms.importing)
    try {
      const res = await fetch('/api/projects/import-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yml }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus(t.forms.importError(data.error)); return }
      setStatus(t.forms.importSuccess(data.imported))
      setYml('')
      router.refresh()
    } catch {
      setStatus(t.forms.requestFailed)
    }
  }

  return (
    <div className="data-panel rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm font-semibold text-white">{t.forms.importSuites}</span>
        <div className="flex gap-1">
          {(['paste', 'file'] as const).map(tabOption => (
            <button key={tabOption} onClick={() => setTab(tabOption)}
              className={`chip-action px-3 py-1 rounded-lg text-xs font-medium ${tab === tabOption ? 'is-active' : ''}`}>
              {tabOption === 'paste' ? t.forms.paste : t.forms.upload}
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
            <p className="text-sm">{t.forms.uploadHint}</p>
            <input ref={fileRef} type="file" accept=".yml,.yaml" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <textarea
            className="w-full rounded-lg px-3 py-2.5 text-xs font-mono h-36 resize-none outline-none"
            style={{ background: 'color-mix(in srgb, var(--bg-card) 82%, transparent)', border: '1px solid var(--border)', color: 'var(--text-secondary)', caretColor: 'var(--accent)' }}
            placeholder={t.forms.pastePlaceholder}
            value={yml}
            onChange={e => setYml(e.target.value)}
          />
        )}
        <div className="flex items-center gap-3">
          <button onClick={handleImport} disabled={!yml.trim()}
            className="primary-action px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40">
            {t.common.import}
          </button>
          {status && <span className="text-sm" style={{ color: status.startsWith('✓') ? 'var(--status-success-text)' : 'var(--status-failed-text)' }}>{status}</span>}
        </div>
      </div>
    </div>
  )
}
