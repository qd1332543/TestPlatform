'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/useLocale'
import type { Dictionary, Locale } from '@/content/i18n'

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
const taskIdPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

const TemplateIcons = {
  failed: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3L25 23H3L14 3Z" fill="color-mix(in srgb, var(--status-failed-text) 14%, transparent)" stroke="var(--status-failed-text)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 10v5M14 18.5v.5" stroke="var(--status-failed-text)" strokeWidth="2" strokeLinecap="round"/>
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
  onboarding: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="5" width="20" height="18" rx="3" fill="color-mix(in srgb, var(--accent) 12%, transparent)" stroke="var(--accent)" strokeWidth="1.5"/>
      <path d="M8 11h8M8 15h12M8 19h7" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M18 7l2 2 3-4" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  queue: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M6 7h11M6 14h16M6 21h8" stroke="var(--accent-3)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="21" cy="7" r="3" fill="color-mix(in srgb, var(--accent-3) 16%, transparent)" stroke="var(--accent-3)" strokeWidth="1.4"/>
      <path d="M20 7h2" stroke="var(--accent-3)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  release: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="6" width="18" height="17" rx="3" fill="color-mix(in srgb, var(--accent-2) 14%, transparent)" stroke="var(--accent-2)" strokeWidth="1.5"/>
      <path d="M9 4v5M19 4v5M5 11h18" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 17l2.5 2.5L18 14" stroke="var(--accent-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  overview: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="5" width="20" height="18" rx="3" fill="color-mix(in srgb, var(--accent) 10%, transparent)" stroke="var(--border-light)" strokeWidth="1.4"/>
      <path d="M8 17l4-4 3 3 5-7" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 21h12" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  build: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 4l9 5-9 5-9-5 9-5Z" fill="color-mix(in srgb, var(--accent-3) 12%, transparent)" stroke="var(--accent-3)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M5 14l9 5 9-5M5 19l9 5 9-5" stroke="var(--accent-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rerun: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M21 10a8 8 0 10.8 6" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M21 5v5h-5" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12l5 3-5 3v-6Z" fill="var(--accent-2)"/>
    </svg>
  ),
}

type CommandTemplate = Dictionary['ai']['templates'][number] & { icon: React.ReactNode }

function TemplateIconFrame({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}
    >
      <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-7 [&>svg]:w-7 [&>svg]:shrink-0">
        {children}
      </span>
    </span>
  )
}

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

function newConversation(title: string): Conversation {
  return { id: crypto.randomUUID(), title, messages: [], updatedAt: Date.now() }
}

function titleFromMessage(content: string, fallback: string) {
  const compact = content.trim().replace(/\s+/g, ' ')
  return compact.length > 18 ? `${compact.slice(0, 18)}...` : compact || fallback
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

function statusMeta(status: string, t: Dictionary) {
  const map: Record<string, { color: string; bg: string }> = {
    queued: { color: '#60A5FA', bg: '#0D1829' },
    running: { color: '#3B82F6', bg: '#0D1F3C' },
    succeeded: { color: '#22C55E', bg: '#0D2818' },
    failed: { color: '#EF4444', bg: '#2A0F0F' },
    cancelled: { color: '#64748B', bg: '#1a2438' },
    timeout: { color: '#F97316', bg: '#2A1A0A' },
  }
  const style = map[status] ?? { color: '#94A3B8', bg: '#1a2438' }
  return { ...style, label: t.status[status as keyof typeof t.status] ?? (status || '-') }
}

function formatDate(value: unknown, locale: Locale) {
  return typeof value === 'string' ? new Date(value).toLocaleString(locale) : '-'
}

function renderTaskLinks(text: string) {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const matches = text.matchAll(taskIdPattern)
  for (const match of matches) {
    const taskId = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    nodes.push(
      <Link
        key={`${taskId}-${index}`}
        href={`/tasks/${taskId}`}
        className="font-mono underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
        style={{ color: '#60A5FA' }}
      >
        {taskId}
      </Link>,
    )
    lastIndex = index + taskId.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length ? nodes : text
}

function OperationCards({
  templates,
  t,
  applyTemplate,
}: {
  templates: CommandTemplate[]
  t: Dictionary
  applyTemplate: (text: string) => void
}) {
  const operations = t.ai.commandCenter.cards
    .map(card => {
      const template = templates.find(item => item.id === card.templateId)
      return template ? { ...card, template } : null
    })
    .filter(Boolean) as Array<{ title: string; desc: string; template: CommandTemplate }>

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {operations.map(operation => (
        <button
          key={operation.template.id}
          type="button"
          onClick={() => applyTemplate(operation.template.text)}
          className="resource-card rounded-xl p-3 text-left transition-colors"
        >
          <div className="flex items-start gap-2.5">
            <TemplateIconFrame>{operation.template.icon}</TemplateIconFrame>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{operation.title}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {operation.desc}
              </div>
              <div className="mt-2 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                {operation.template.label}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function ActionCards({ actions, t, locale }: { actions?: ToolResult[]; t: Dictionary; locale: Locale }) {
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
          const meta = statusMeta(status, t)
          const report = firstRecord(task.reports)
          const analysis = firstRecord(task.ai_analyses)
          const title = action.action === 'create_task' ? t.ai.taskCreated : t.ai.taskStatus
          const key = `${action.action}-${taskId}-${index}`
          const card = (
            <div className="rounded-xl overflow-hidden transition-colors group-hover:border-sky-400" style={{ background: '#0A0F1E', border: '1px solid #1E3A5F' }}>
              <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="font-semibold text-white">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>{t.common.project}</div>
                  <div className="mt-1 font-medium text-white truncate">{relationName(task.projects)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>{t.common.suite}</div>
                  <div className="mt-1 font-medium text-white truncate">{relationName(task.test_suites)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>{t.common.environment}</div>
                  <div className="mt-1 font-medium text-white">{environment}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>{t.common.taskId}</div>
                  <div className="mt-1 font-mono text-[11px] truncate" style={{ color: '#60A5FA' }}>{taskId}</div>
                </div>
                {action.action === 'get_task_detail' && (
                  <>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>{t.common.createdAt}</div>
                      <div className="mt-1 text-white">{formatDate(task.created_at, locale)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>{t.common.startedAt}</div>
                      <div className="mt-1 text-white">{formatDate(task.started_at, locale)}</div>
                    </div>
                  </>
                )}
              </div>
              {report && typeof report.summary === 'string' && (
                <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="font-medium text-white">{t.common.reportSummary}</div>
                  <div className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{report.summary}</div>
                </div>
              )}
              {analysis && (
                <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="font-medium text-white">{t.reports.aiAnalysis}</div>
                  {typeof analysis.failure_reason === 'string' && <div className="mt-1" style={{ color: '#EF4444' }}>{analysis.failure_reason}</div>}
                  {typeof analysis.suggestion === 'string' && <div className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.suggestion}</div>}
                </div>
              )}
              {taskId !== '-' && (
                <div className="px-4 py-2 text-xs font-medium transition-colors group-hover:text-white" style={{ borderTop: '1px solid var(--border)', color: '#60A5FA' }}>
                  {t.ai.openTaskDetail}
                </div>
              )}
            </div>
          )
          return taskId !== '-'
            ? <Link key={key} href={`/tasks/${taskId}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl">{card}</Link>
            : <div key={key}>{card}</div>
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
                {t.ai.projectCreated}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><div style={{ color: 'var(--text-muted)' }}>{t.common.name}</div><div className="mt-1 text-white">{name}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>{t.common.key}</div><div className="mt-1 font-mono" style={{ color: '#60A5FA' }}>{key}</div></div>
                <div className="col-span-2"><div style={{ color: 'var(--text-muted)' }}>{t.common.repository}</div><div className="mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{repo}</div></div>
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
                    <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top" style={{ color: '#CBD5E1' }}>{renderTaskLinks(cell.replace(/\*\*/g, '').replace(/`/g, ''))}</td>
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
    if (text) nodes.push(<div key={`text-${index}`} className="whitespace-pre-wrap">{renderTaskLinks(text)}</div>)
  }

  return <div className={hasActions ? 'mt-3 space-y-2' : 'space-y-2'}>{nodes}</div>
}

export default function AiPage() {
  const { locale, dictionary: t } = useLocale()
  const templates = t.ai.templates.map(template => ({
    ...template,
    icon: TemplateIcons[template.id as keyof typeof TemplateIcons] ?? TemplateIcons.report,
  }))
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
    const first = newConversation(t.ai.newConversation)
    queueMicrotask(() => {
      setConversations([first])
      setActiveId(first.id)
    })
  }, [t.ai.newConversation])

  const applyTemplate = useCallback((text: string) => {
    setInput(text)
    setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      const idx = text.indexOf('['), end = text.indexOf(']')
      el.focus()
      if (idx !== -1 && end !== -1) el.setSelectionRange(idx, end + 1)
    }, 0)
  }, [setInput])

  function createConversation() {
    const conversation = newConversation(t.ai.newConversation)
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
      const next = remaining.length ? remaining : [newConversation(t.ai.newConversation)]
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
              title: c.title === t.ai.newConversation && nextMessages[0]?.content ? titleFromMessage(nextMessages[0].content, t.ai.newConversation) : c.title,
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
        content: data.reply ?? data.error ?? t.ai.requestFailed,
        actions: Array.isArray(data.actions) ? data.actions : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      }])
    } catch {
      persistMessages([...withUser, { role: 'assistant', content: t.ai.retryFailed }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex min-h-full flex-col gap-4">
      <section className="data-panel rounded-xl p-5">
        <div className="mb-4">
          <h2 className="section-title">{t.ai.commandCenter.title}</h2>
          <p className="section-subtitle mt-1 hidden md:block">{t.ai.commandCenter.description}</p>
        </div>
        <OperationCards templates={templates} t={t} applyTemplate={applyTemplate} />
        <div className="mt-3 hidden flex-wrap gap-2 lg:flex">
          {t.ai.commandCenter.contextItems.map(item => (
            <span key={item.label} className="meta-pill px-3 py-1.5 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              <span className="mx-1.5" style={{ color: 'var(--text-muted)' }}>·</span>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <aside className="data-panel hidden max-h-[760px] xl:flex shrink-0 flex-col rounded-xl overflow-hidden">
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={createConversation}
            className="primary-action w-full px-3 py-2 rounded-lg text-sm font-semibold"
          >
            + {t.ai.newConversation}
          </button>
        </div>
        <div className="quiet-scrollbar flex-1 overflow-y-auto p-2 space-y-1">
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
                  {c.messages.length ? t.ai.messageCount(c.messages.length) : t.ai.emptyMessages}
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteConversation(c.id)}
                className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
                title={t.ai.deleteConversation}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="data-panel flex min-h-[680px] flex-col rounded-xl p-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={createConversation}
          className="primary-action xl:hidden px-3 py-1.5 rounded-lg text-xs font-semibold"
        >
          {t.ai.newConversation}
        </button>
        <div className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {messages.length ? t.ai.messageCount(messages.length) : t.ai.emptyMessages}
        </div>
      </div>
      <div className="mb-4 xl:hidden">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {t.ai.commandCenter.mobileHistory}
        </div>
        <div className="quiet-scrollbar flex gap-2 overflow-x-auto pb-1">
          {conversations.slice(0, 8).map(conversation => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => selectConversation(conversation)}
              className="secondary-action shrink-0 rounded-lg px-3 py-2 text-left text-xs"
              style={activeId === conversation.id ? { borderColor: 'var(--accent)', color: 'var(--text-primary)' } : undefined}
            >
              <span className="block max-w-40 truncate font-semibold">{conversation.title}</span>
              <span style={{ color: 'var(--text-muted)' }}>{conversation.messages.length ? t.ai.messageCount(conversation.messages.length) : t.ai.emptyMessages}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="quiet-scrollbar h-[520px] overflow-y-auto space-y-4 pb-2 md:h-[560px] xl:h-[600px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--accent)' }}>✦</div>
            <div>
              <p className="font-semibold text-base text-white">{t.ai.greeting}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.ai.greetingHint}</p>
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
              <ActionCards actions={m.actions} t={t} locale={locale} />
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
      {/* Input */}
      <div className="mt-3">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          <button className="shrink-0 opacity-40 hover:opacity-70 transition-opacity" title={t.ai.attachment}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535l-6 6a1 1 0 01-1.414-1.414l5.5-5.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <input
            ref={inputRef}
            className="flex-1 text-sm text-white outline-none bg-transparent py-0.5"
            style={{ caretColor: 'var(--accent)' }}
            placeholder={t.ai.placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: input.trim() ? 'var(--accent)' : 'var(--surface-soft)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          {t.ai.footer} · <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Tab</kbd> {t.ai.switchParams}
        </p>
      </div>
      </div>

      <aside className="quiet-scrollbar data-panel hidden max-h-[760px] xl:block rounded-xl p-4 overflow-y-auto">
        <div className="section-title">{t.ai.greeting}</div>
        <div className="section-subtitle mt-1">{t.ai.greetingHint}</div>
        <div className="mt-4 space-y-3">
          {templates.map(template => {
            const parts = parseTemplate(template.text)
            return (
              <button
                key={template.label}
                onClick={() => applyTemplate(template.text)}
                className="resource-card w-full rounded-xl px-4 py-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TemplateIconFrame>{template.icon}</TemplateIconFrame>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{template.label}</div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{template.desc}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {parts.map((part, index) =>
                    part.type === 'param'
                      ? <span key={index} style={{ color: 'var(--accent)' }}>[{part.value}]</span>
                      : <span key={index}>{part.value}</span>
                  )}
                </p>
              </button>
            )
          })}
        </div>
      </aside>
      </div>
    </div>
  )
}
