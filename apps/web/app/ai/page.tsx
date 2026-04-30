'use client'

import { useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AiPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? data.error ?? '请求失败' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '请求失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-xl font-semibold">AI 助手</h1>
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 overflow-auto space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            可以问：最近有哪些失败的任务？失败原因是什么？
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm px-3 py-2 rounded max-w-xl whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-50 ml-auto' : 'bg-gray-100'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-sm px-3 py-2 rounded bg-gray-100 max-w-xl text-gray-400">思考中...</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
          placeholder="输入消息..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          发送
        </button>
      </div>
    </div>
  )
}
