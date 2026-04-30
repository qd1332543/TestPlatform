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
      // 简单解析 yml suites 块（依赖服务端 js-yaml）
      const res = await fetch('/api/projects/import-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yml }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus(`错误：${data.error}`); return }
      setStatus(`成功导入 ${data.imported} 个套件`)
      setYml('')
      router.refresh()
    } catch (e) {
      setStatus('请求失败')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium">从 test-platform.yml 导入套件</div>
      <div className="p-4 space-y-3">
        <textarea
          className="w-full border border-gray-200 rounded px-3 py-2 text-xs font-mono h-40 resize-none"
          placeholder="粘贴 test-platform.yml 内容..."
          value={yml}
          onChange={e => setYml(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button onClick={handleImport} disabled={!yml.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            导入
          </button>
          {status && <span className="text-sm text-gray-500">{status}</span>}
        </div>
      </div>
    </div>
  )
}
