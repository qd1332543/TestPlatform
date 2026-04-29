'use client'

import { useState } from 'react'

export default function AiPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])

  function handleSend() {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    // TODO: 接入 Claude API
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-xl font-semibold">AI 助手</h1>
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 overflow-auto space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            你可以问：用 staging 环境跑云鹿商城 API 冒烟测试
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm px-3 py-2 rounded max-w-xl ${m.role === 'user' ? 'bg-blue-50 ml-auto' : 'bg-gray-100'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
          placeholder="输入消息..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          发送
        </button>
      </div>
    </div>
  )
}
