'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const templates = [
  {
    label: '失败任务',
    icon: '🔴',
    desc: '查看最近失败的任务',
    text: '查询最近失败的任务，列出项目名称、套件名称和失败原因',
  },
  {
    label: '创建项目',
    icon: '📁',
    desc: '新建一个测试项目',
    text: '帮我创建一个新项目，项目名称：[名称]，标识：[key]，仓库地址：[repo_url]',
  },
  {
    label: '触发测试',
    icon: '▶️',
    desc: '为项目创建测试任务',
    text: '帮我为项目 [项目名] 的套件 [套件名] 在 [环境] 环境创建一个测试任务',
  },
  {
    label: '今日报告',
    icon: '📊',
    desc: '汇总今天的测试结果',
    text: '分析今日测试报告，总结成功率、主要失败原因，并给出改进建议',
  },
  {
    label: '执行器状态',
    icon: '🖥️',
    desc: '查看执行器在线情况',
    text: '列出当前所有执行器的名称和在线状态',
  },
  {
    label: '项目套件',
    icon: '🗂️',
    desc: '查看项目下的套件列表',
    text: '列出项目 [项目名] 下所有的测试套件',
  },
]

// Parse template text into segments: plain text and [param] placeholders
function parseTemplate(text: string): { type: 'text' | 'param'; value: string }[] {
  const parts: { type: 'text' | 'param'; value: string }[] = []
  const regex = /\[([^\]]+)\]/g
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push({ type: 'param', value: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

export default function AiPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Apply template: fill input and select first [param]
  const applyTemplate = useCallback((text: string) => {
    setInput(text)
    setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      const idx = text.indexOf('[')
      const end = text.indexOf(']')
      if (idx !== -1 && end !== -1) {
        el.focus()
        el.setSelectionRange(idx, end + 1)
      } else {
        el.focus()
      }
    }, 0)
  }, [])

  // Tab key: jump to next [param] in input
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = inputRef.current
      if (!el) return
      const val = el.value
      const cursor = el.selectionEnd ?? 0
      // Find next [ after cursor
      const next = val.indexOf('[', cursor)
      const nextEnd = val.indexOf(']', next)
      if (next !== -1 && nextEnd !== -1) {
        el.setSelectionRange(next, nextEnd + 1)
      } else {
        // Wrap around to first [
        const first = val.indexOf('[')
        const firstEnd = val.indexOf(']', first)
        if (first !== -1 && firstEnd !== -1) el.setSelectionRange(first, firstEnd + 1)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSend()
    }
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
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200">✦</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">AI 助手</h1>
          <p className="text-xs text-gray-400">DeepSeek · 创建项目 / 触发测试 / 分析报告</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 min-h-0 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-4xl">✦</div>
            <div>
              <p className="text-gray-800 font-semibold text-base">你好，我是 AI 助手</p>
              <p className="text-sm text-gray-400 mt-1">选择下方模板快速开始，或直接输入问题</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs shrink-0 mt-0.5 shadow-sm">✦</div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs shrink-0 mt-0.5 shadow-sm">✦</div>
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

      {/* Templates */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {templates.map(t => {
          const parts = parseTemplate(t.text)
          return (
            <button
              key={t.label}
              onClick={() => applyTemplate(t.text)}
              className="flex flex-col items-start px-3 py-3 bg-white border border-gray-100 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700">{t.label}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                {parts.map((p, i) =>
                  p.type === 'param'
                    ? <span key={i} className="text-indigo-400 font-medium">[{p.value}]</span>
                    : <span key={i}>{p.value}</span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      {/* Input */}
      <div className="mt-3">
        <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-indigo-300 focus-within:shadow-md focus-within:shadow-indigo-100 transition-all">
          <input
            ref={inputRef}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent py-0.5"
            placeholder="输入消息，Tab 切换参数，Enter 发送..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity font-medium"
          >发送</button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">点击模板后用 <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-xs">Tab</kbd> 键跳转到下一个参数</p>
      </div>
    </div>
  )
}
