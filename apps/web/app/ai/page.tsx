'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const TemplateIcons = {
  failed: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill="#2A0F0F" stroke="#EF4444" strokeWidth="1.5"/>
      <path d="M14 8v7M14 18v1.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  project: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="7" width="22" height="17" rx="2.5" fill="#0D1829" stroke="#3B82F6" strokeWidth="1.5"/>
      <path d="M3 12h22" stroke="#3B82F6" strokeWidth="1.2"/>
      <path d="M3 11V9.5C3 8.1 4.1 7 5.5 7H10l2 2.5H3" fill="#1E3A5F"/>
      <path d="M8 17h12M8 20.5h8" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  trigger: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill="#0D1829" stroke="#3B82F6" strokeWidth="1.5"/>
      <path d="M11 9.5l9 4.5-9 4.5V9.5Z" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  ),
  report: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3" width="20" height="22" rx="2.5" fill="#0D2818" stroke="#22C55E" strokeWidth="1.5"/>
      <path d="M8 10h12M8 14h12M8 18h7" stroke="#22C55E" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="20" cy="19" r="4" fill="#0D2818" stroke="#22C55E" strokeWidth="1.2"/>
      <path d="M18.5 19l1 1 2-2" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  executor: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2.5" fill="#0D1829" stroke="#A78BFA" strokeWidth="1.5"/>
      <rect x="3" y="19" width="22" height="3" rx="1" fill="#1a1040" stroke="#A78BFA" strokeWidth="1"/>
      <path d="M9 13l3 3 6-6" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14" cy="21.5" r="0.8" fill="#A78BFA"/>
    </svg>
  ),
  suite: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="#0D1829" stroke="#F59E0B" strokeWidth="1.5"/>
      <rect x="15" y="3" width="10" height="10" rx="2" fill="#0D1829" stroke="#F59E0B" strokeWidth="1.5"/>
      <rect x="3" y="15" width="10" height="10" rx="2" fill="#0D1829" stroke="#F59E0B" strokeWidth="1.5"/>
      <rect x="15" y="15" width="10" height="10" rx="2" fill="#0D1829" stroke="#F59E0B" strokeWidth="1.5"/>
    </svg>
  ),
}

const templates = [
  {
    label: '失败任务分析',
    icon: TemplateIcons.failed,
    desc: '查看最近失败的任务，列出项目、套件和具体失败原因，快速定位问题',
    text: '查询最近失败的任务，列出项目名称、套件名称和失败原因',
  },
  {
    label: '创建新项目',
    icon: TemplateIcons.project,
    desc: '快速新建一个测试项目，配置项目名称、唯一标识和代码仓库地址',
    text: '帮我创建一个新项目，项目名称：[名称]，标识：[key]，仓库地址：[repo_url]',
  },
  {
    label: '触发测试任务',
    icon: TemplateIcons.trigger,
    desc: '为指定项目的测试套件在目标环境中创建并触发一次自动化测试',
    text: '帮我为项目 [项目名] 的套件 [套件名] 在 [环境] 环境创建一个测试任务',
  },
  {
    label: '今日测试报告',
    icon: TemplateIcons.report,
    desc: '汇总今天所有测试的执行情况，分析成功率趋势和主要失败原因',
    text: '分析今日测试报告，总结成功率、主要失败原因，并给出改进建议',
  },
  {
    label: '执行器状态',
    icon: TemplateIcons.executor,
    desc: '查看所有注册执行器的在线状态、负载情况和最近执行记录',
    text: '列出当前所有执行器的名称、在线状态和最近执行的任务',
  },
  {
    label: '项目套件列表',
    icon: TemplateIcons.suite,
    desc: '查看指定项目下所有测试套件的名称、类型和执行命令配置',
    text: '列出项目 [项目名] 下所有的测试套件，包括套件类型和执行命令',
  },
]

function parseTemplate(text: string) {
  const parts: { type: 'text' | 'param'; value: string }[] = []
  const regex = /\[([^\]]+)\]/g
  let last = 0, m
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const applyTemplate = useCallback((text: string) => {
    setInput(text)
    setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      const idx = text.indexOf('['), end = text.indexOf(']')
      el.focus()
      if (idx !== -1 && end !== -1) el.setSelectionRange(idx, end + 1)
    }, 0)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = inputRef.current
      if (!el) return
      const val = el.value, cursor = el.selectionEnd ?? 0
      const next = val.indexOf('[', cursor), nextEnd = val.indexOf(']', next)
      if (next !== -1 && nextEnd !== -1) { el.setSelectionRange(next, nextEnd + 1); return }
      const first = val.indexOf('['), firstEnd = val.indexOf(']', first)
      if (first !== -1 && firstEnd !== -1) el.setSelectionRange(first, firstEnd + 1)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 4px 20px #3B82F640' }}>✦</div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">AI 助手</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>DeepSeek · 创建项目 / 触发测试 / 分析报告</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 min-h-0 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, #0D1829, #111827)', border: '1px solid var(--border)' }}>✦</div>
            <div>
              <p className="font-semibold text-base text-white">你好，我是 AI 助手</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>选择下方模板快速开始，或直接输入问题</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>✦</div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              style={m.role === 'user'
                ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }
                : { background: 'var(--bg-card)', color: '#CBD5E1', border: '1px solid var(--border)' }
              }>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shrink-0 mt-0.5"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>✦</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#3B82F6', animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Templates */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {templates.map(t => {
          const parts = parseTemplate(t.text)
          return (
            <button key={t.label} onClick={() => applyTemplate(t.text)}
              className="flex flex-col items-start px-4 py-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3B82F6'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.2)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div className="mb-2">{t.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{t.label}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {parts.map((p, i) =>
                  p.type === 'param'
                    ? <span key={i} style={{ color: '#60A5FA' }}>[{p.value}]</span>
                    : <span key={i}>{p.value}</span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      {/* Input */}
      <div className="mt-3">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          {/* 附件按钮 */}
          <button className="shrink-0 opacity-40 hover:opacity-70 transition-opacity" title="附件">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535l-6 6a1 1 0 01-1.414-1.414l5.5-5.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <input
            ref={inputRef}
            className="flex-1 text-sm text-white outline-none bg-transparent py-0.5"
            style={{ caretColor: '#3B82F6' }}
            placeholder="可以描述任务或提问任何问题..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {/* 发送按钮 — 圆形 */}
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: input.trim() ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : '#1E2D45' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          内容由 AI 生成，请仔细甄别 · <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Tab</kbd> 切换参数
        </p>
      </div>
    </div>
  )
}
