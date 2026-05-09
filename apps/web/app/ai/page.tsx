'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Suggestion = { label: string; prompt: string }
type ToolResult = { ok: boolean; action?: string; data?: unknown; error?: string }
type Message = { role: 'user' | 'assistant'; content: string; suggestions?: Suggestion[]; actions?: ToolResult[] }
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number }

const historyKey = 'meteortest.ai.conversations.v1'
const settingsKey = 'meteortest.settings.v1'
const defaultAiSettings = {
  aiModel: 'deepseek-v4-pro',
  aiBaseUrl: 'https://api.deepseek.com',
}

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

function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: '新对话', messages: [], updatedAt: Date.now() }
}

function titleFromMessage(content: string) {
  const compact = content.trim().replace(/\s+/g, ' ')
  return compact.length > 18 ? `${compact.slice(0, 18)}...` : compact || '新对话'
}

function getAiSettings() {
  const raw = window.localStorage.getItem(settingsKey)
  if (!raw) return defaultAiSettings
  try {
    const settings = JSON.parse(raw) as { aiModel?: string; aiBaseUrl?: string }
    return {
      aiModel: settings.aiModel?.trim() || defaultAiSettings.aiModel,
      aiBaseUrl: settings.aiBaseUrl?.trim() || defaultAiSettings.aiBaseUrl,
    }
  } catch {
    return defaultAiSettings
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return relationName(value[0])
  if (!isRecord(value)) return '-'
  return typeof value.name === 'string' ? value.name : '-'
}

function taskActionData(action: ToolResult) {
  if (!action.ok || !['create_task', 'get_task_detail'].includes(action.action ?? '') || !isRecord(action.data)) return null
  return action.data
}

function projectActionData(action: ToolResult) {
  if (!action.ok || action.action !== 'create_project' || !isRecord(action.data)) return null
  return action.data
}

function firstRecord(value: unknown) {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null
  return isRecord(value) ? value : null
}

function statusMeta(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    queued: { label: '排队中', color: '#60A5FA', bg: '#0D1829' },
    running: { label: '运行中', color: '#3B82F6', bg: '#0D1F3C' },
    succeeded: { label: '已成功', color: '#22C55E', bg: '#0D2818' },
    failed: { label: '已失败', color: '#EF4444', bg: '#2A0F0F' },
    cancelled: { label: '已取消', color: '#64748B', bg: '#1a2438' },
    timeout: { label: '已超时', color: '#F97316', bg: '#2A1A0A' },
  }
  return map[status] ?? { label: status || '-', color: '#94A3B8', bg: '#1a2438' }
}

function formatDate(value: unknown) {
  return typeof value === 'string' ? new Date(value).toLocaleString('zh-CN') : '-'
}

function ActionCards({ actions }: { actions?: ToolResult[] }) {
  const visibleActions = actions?.filter(action => action.ok && ['create_task', 'get_task_detail', 'create_project'].includes(action.action ?? '')) ?? []
  if (!visibleActions.length) return null

  return (
    <div className="space-y-3">
      {visibleActions.map((action, index) => {
        const task = taskActionData(action)
        if (task) {
          const taskId = typeof task.id === 'string' ? task.id : '-'
          const environment = typeof task.environment === 'string' ? task.environment : '-'
          const status = typeof task.status === 'string' ? task.status : '-'
          const meta = statusMeta(status)
          const report = firstRecord(task.reports)
          const analysis = firstRecord(task.ai_analyses)
          const title = action.action === 'create_task' ? '测试任务已创建' : '任务状态'
          return (
            <div key={`${action.action}-${taskId}-${index}`} className="rounded-xl overflow-hidden" style={{ background: '#0A0F1E', border: '1px solid #1E3A5F' }}>
              <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="font-semibold text-white">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>项目</div>
                  <div className="mt-1 font-medium text-white truncate">{relationName(task.projects)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>套件</div>
                  <div className="mt-1 font-medium text-white truncate">{relationName(task.test_suites)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>环境</div>
                  <div className="mt-1 font-medium text-white">{environment}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>任务 ID</div>
                  <div className="mt-1 font-mono text-[11px] truncate" style={{ color: '#60A5FA' }}>{taskId}</div>
                </div>
                {action.action === 'get_task_detail' && (
                  <>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>创建时间</div>
                      <div className="mt-1 text-white">{formatDate(task.created_at)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>开始时间</div>
                      <div className="mt-1 text-white">{formatDate(task.started_at)}</div>
                    </div>
                  </>
                )}
              </div>
              {report && typeof report.summary === 'string' && (
                <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="font-medium text-white">报告摘要</div>
                  <div className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{report.summary}</div>
                </div>
              )}
              {analysis && (
                <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="font-medium text-white">AI 分析</div>
                  {typeof analysis.failure_reason === 'string' && <div className="mt-1" style={{ color: '#EF4444' }}>{analysis.failure_reason}</div>}
                  {typeof analysis.suggestion === 'string' && <div className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.suggestion}</div>}
                </div>
              )}
            </div>
          )
        }

        const project = projectActionData(action)
        if (project) {
          const key = typeof project.key === 'string' ? project.key : '-'
          const name = typeof project.name === 'string' ? project.name : '-'
          const repo = typeof project.repo_url === 'string' && project.repo_url ? project.repo_url : '-'
          return (
            <div key={`${action.action}-${key}-${index}`} className="rounded-xl px-4 py-3" style={{ background: '#0A0F1E', border: '1px solid #1E3A5F' }}>
              <div className="flex items-center gap-2 font-semibold text-white">
                <span className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                项目已创建
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><div style={{ color: 'var(--text-muted)' }}>名称</div><div className="mt-1 text-white">{name}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>标识</div><div className="mt-1 font-mono" style={{ color: '#60A5FA' }}>{key}</div></div>
                <div className="col-span-2"><div style={{ color: 'var(--text-muted)' }}>仓库</div><div className="mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{repo}</div></div>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function MessageContent({ content, hasActions }: { content: string; hasActions: boolean }) {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    if (lines[index]?.includes('|') && isTableSeparator(lines[index + 1] ?? '')) {
      const headers = splitTableRow(lines[index])
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      nodes.push(
        <div key={`table-${index}`} className="my-2 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: '#0A0F1E' }}>
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ borderTop: '1px solid var(--border)' }}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top" style={{ color: '#CBD5E1' }}>{cell.replace(/\*\*/g, '').replace(/`/g, '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && !(lines[index]?.includes('|') && isTableSeparator(lines[index + 1] ?? ''))) {
      paragraph.push(lines[index])
      index += 1
    }
    const text = paragraph.join('\n').trim()
    if (text) nodes.push(<div key={`text-${index}`} className="whitespace-pre-wrap">{text}</div>)
  }

  return <div className={hasActions ? 'mt-3 space-y-2' : 'space-y-2'}>{nodes}</div>
}

export default function AiPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const raw = window.localStorage.getItem(historyKey)
    if (raw) {
      try {
        const stored = JSON.parse(raw) as Conversation[]
        if (Array.isArray(stored) && stored.length > 0) {
          const sorted = stored.sort((a, b) => b.updatedAt - a.updatedAt)
          window.localStorage.setItem(historyKey, JSON.stringify(sorted.slice(0, 30)))
          queueMicrotask(() => {
            setConversations(sorted)
            setActiveId(sorted[0].id)
            setMessages(sorted[0].messages)
          })
          return
        }
      } catch {
        window.localStorage.removeItem(historyKey)
      }
    }
    const first = newConversation()
    queueMicrotask(() => {
      setConversations([first])
      setActiveId(first.id)
    })
  }, [])

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

  function createConversation() {
    const conversation = newConversation()
    setConversations(prev => [conversation, ...prev])
    setActiveId(conversation.id)
    setMessages([])
    setInput('')
  }

  function selectConversation(conversation: Conversation) {
    if (loading) return
    setActiveId(conversation.id)
    setMessages(conversation.messages)
    setInput('')
  }

  function deleteConversation(id: string) {
    if (loading) return
    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== id)
      const next = remaining.length ? remaining : [newConversation()]
      window.localStorage.setItem(historyKey, JSON.stringify(next))
      if (id === activeId) {
        setActiveId(next[0].id)
        setMessages(next[0].messages)
      }
      return next
    })
  }

  function persistMessages(nextMessages: Message[]) {
    setMessages(nextMessages)
    setConversations(prev => {
      const next = prev
        .map(c => c.id === activeId
          ? {
              ...c,
              messages: nextMessages,
              title: c.title === '新对话' && nextMessages[0]?.content ? titleFromMessage(nextMessages[0].content) : c.title,
              updatedAt: nextMessages.length ? Date.now() : c.updatedAt,
            }
          : c)
        .sort((a, b) => b.updatedAt - a.updatedAt)
      window.localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 30)))
      return next
    })
  }

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

  function applySuggestion(prompt: string) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    const history = messages.map(({ role, content }) => ({ role, content }))
    const currentInput = input
    const withUser = [...messages, userMsg]
    persistMessages(withUser)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history, aiConfig: getAiSettings() }),
      })
      const data = await res.json()
      persistMessages([...withUser, {
        role: 'assistant',
        content: data.reply ?? data.error ?? '请求失败',
        actions: Array.isArray(data.actions) ? data.actions : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      }])
    } catch {
      persistMessages([...withUser, { role: 'assistant', content: '请求失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full gap-4 min-w-0">
      <aside className="data-panel hidden lg:flex w-64 shrink-0 flex-col rounded-xl overflow-hidden">
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={createConversation}
            className="primary-action w-full px-3 py-2 rounded-lg text-sm font-semibold"
          >
            + 新对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => (
            <div key={c.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => selectConversation(c)}
                className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors"
                style={activeId === c.id
                  ? { background: 'var(--surface-soft)', border: '1px solid var(--border-light)' }
                  : { border: '1px solid transparent' }
                }
              >
                <div className="truncate text-sm font-medium" style={{ color: activeId === c.id ? '#fff' : 'var(--text-secondary)' }}>{c.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {c.messages.length ? `${c.messages.length} 条消息` : '暂无消息'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteConversation(c.id)}
                className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
                title="删除对话"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-col h-full w-full max-w-3xl mx-auto min-w-0">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg"
          style={{ background: 'var(--accent)', color: '#06100C', boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 24%, transparent)' }}>✦</div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">AI 助手</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>DeepSeek · 创建项目 / 创建任务 / 查询套件 / 分析报告</p>
        </div>
        <button
          onClick={createConversation}
          className="primary-action lg:hidden ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
        >
          新对话
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D45 transparent' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--accent)' }}>✦</div>
            <div>
              <p className="font-semibold text-base text-white">你好，我是 AI 助手</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>选择下方模板快速开始，或直接输入问题</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 mt-0.5"
                style={{ background: 'var(--accent)', color: '#06100C' }}>✦</div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'rounded-tr-sm whitespace-pre-wrap' : 'rounded-tl-sm'}`}
              style={m.role === 'user'
                ? { background: 'var(--accent)', color: '#06100C' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              <ActionCards actions={m.actions} />
              {m.content && <MessageContent content={m.content} hasActions={Boolean(m.actions?.length)} />}
              {m.role === 'assistant' && Boolean(m.suggestions?.length) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.suggestions?.map(suggestion => (
                    <button
                      key={suggestion.prompt}
                      type="button"
                      onClick={() => applySuggestion(suggestion.prompt)}
                      className="chip-action rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 mt-0.5"
              style={{ background: 'var(--accent)', color: '#06100C' }}>✦</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${d}ms` }} />
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
                e.currentTarget.style.borderColor = 'var(--border-light)'
                e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'
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
                    ? <span key={i} style={{ color: 'var(--accent)' }}>[{p.value}]</span>
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
            style={{ caretColor: 'var(--accent)' }}
            placeholder="可以描述任务或提问任何问题..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {/* 发送按钮 — 圆形 */}
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: input.trim() ? 'var(--accent)' : 'var(--surface-soft)' }}>
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
    </div>
  )
}
