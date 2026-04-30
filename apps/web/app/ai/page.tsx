'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const templates = [
  { label: '查询失败任务', text: '查询最近失败的任务，列出项目名称、套件和失败原因' },
  { label: '创建项目', text: '帮我创建一个新项目，项目名称：[名称]，标识：[key]，仓库：[repo_url]' },
  { label: '创建任务', text: '帮我为项目 [项目名] 的套件 [套件名] 在 [dev/staging/prod] 环境创建一个测试任务' },
  { label: '分析报告', text: '分析今日测试报告，总结成功率、主要失败原因和建议' },
  { label: '查询执行器', text: '列出当前所有执行器的状态' },
]

export default function AiPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function applyTemplate(text: string) {
    setInput(text)
    inputRef.current?.focus()
  }

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
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg shadow-md shadow-indigo-200">✦</div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI 助手</h1>
            <p className="text-xs text-gray-400">由 DeepSeek 驱动 · 可创建项目、任务、分析报告</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 min-h-0 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl text-indigo-400">✦</div>
            <div>
              <p className="text-gray-700 font-medium">你好，我是 AI 助手</p>
              <p className="text-sm text-gray-400 mt-1">可以帮你分析测试结果、创建任务、查询报告</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs mr-2 mt-0.5 shrink-0">✦</div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs mr-2 mt-0.5 shrink-0">✦</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 模板块 */}
      <div className="flex gap-2 flex-wrap mb-3">
        {templates.map(t => (
          <button
            key={t.label}
            onClick={() => applyTemplate(t.text)}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >{t.label}</button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm focus-within:border-indigo-300 focus-within:shadow-indigo-100 focus-within:shadow-md transition-all">
          <input
            ref={inputRef}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent py-1"
            placeholder="输入消息，按 Enter 发送..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >发送</button>
        </div>
      </div>
    </div>
  )
}
