'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/useLocale'
import type { Dictionary, Locale } from '@/content/i18n'
import {
  aiHistoryStorageKey,
  normalizeAiConversation,
  type AiConversation,
  type AiMessage,
  type AiSuggestion,
  type AiTaskPickerProject,
  type AiToolResult,
} from '@/lib/account/aiHistory'
import { taskRef } from '@/lib/viewModels/displayRefs'

type ToolResult = AiToolResult
type Message = AiMessage
type Conversation = AiConversation

const historyKey = aiHistoryStorageKey
const settingsKey = 'meteortest.settings.v1'
const defaultAiSettings = {
  aiModel: 'deepseek-v4-pro',
  aiBaseUrl: 'https://api.deepseek.com',
}
const taskRefPattern = /\bMT-\d{8}-\d{4}\b/gi
const internalUuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

const TemplateIcons = {
  failed: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3L25 23H3L14 3Z" fill="color-mix(in srgb, var(--status-failed-text) 14%, transparent)" stroke="var(--status-failed-text)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 10v5M14 18.5v.5" stroke="var(--status-failed-text)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  project: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="7" width="22" height="17" rx="2.5" fill="color-mix(in srgb, var(--accent-3) 12%, transparent)" stroke="var(--accent-3)" strokeWidth="1.5"/>
      <path d="M3 12h22" stroke="var(--accent-3)" strokeWidth="1.2"/>
      <path d="M3 11V9.5C3 8.1 4.1 7 5.5 7H10l2 2.5H3" fill="color-mix(in srgb, var(--accent-3) 18%, transparent)"/>
      <path d="M8 17h12M8 20.5h8" stroke="var(--accent-3)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  trigger: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill="color-mix(in srgb, var(--accent-3) 12%, transparent)" stroke="var(--accent-3)" strokeWidth="1.5"/>
      <path d="M11 9.5l9 4.5-9 4.5V9.5Z" fill="var(--accent-3)" stroke="var(--accent-3)" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  ),
  report: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3" width="20" height="22" rx="2.5" fill="var(--status-success-bg)" stroke="var(--status-success-text)" strokeWidth="1.5"/>
      <path d="M8 10h12M8 14h12M8 18h7" stroke="var(--status-success-text)" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="20" cy="19" r="4" fill="var(--status-success-bg)" stroke="var(--status-success-text)" strokeWidth="1.2"/>
      <path d="M18.5 19l1 1 2-2" stroke="var(--status-success-text)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  executor: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2.5" fill="color-mix(in srgb, var(--accent) 12%, transparent)" stroke="var(--accent)" strokeWidth="1.5"/>
      <rect x="3" y="19" width="22" height="3" rx="1" fill="color-mix(in srgb, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth="1"/>
      <path d="M9 13l3 3 6-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14" cy="21.5" r="0.8" fill="var(--accent)"/>
    </svg>
  ),
  suite: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="color-mix(in srgb, var(--accent-2) 12%, transparent)" stroke="var(--accent-2)" strokeWidth="1.5"/>
      <rect x="15" y="3" width="10" height="10" rx="2" fill="color-mix(in srgb, var(--accent-2) 12%, transparent)" stroke="var(--accent-2)" strokeWidth="1.5"/>
      <rect x="3" y="15" width="10" height="10" rx="2" fill="color-mix(in srgb, var(--accent-2) 12%, transparent)" stroke="var(--accent-2)" strokeWidth="1.5"/>
      <rect x="15" y="15" width="10" height="10" rx="2" fill="color-mix(in srgb, var(--accent-2) 12%, transparent)" stroke="var(--accent-2)" strokeWidth="1.5"/>
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

function HistoryPanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11 4.5L7.5 9l3.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 4.5L3.5 9 7 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
    </svg>
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

function isConversation(value: Conversation | null): value is Conversation {
  return value !== null
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

async function fetchAccountConversations() {
  const response = await fetch('/api/ai/conversations', { cache: 'no-store' })
  if (!response.ok) return null
  const data = await response.json() as { conversations?: unknown[] }
  return (data.conversations ?? []).map(normalizeAiConversation).filter(Boolean) as Conversation[]
}

async function createAccountConversation(title: string, messages: Message[] = []) {
  const response = await fetch('/api/ai/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, messages }),
  })
  if (!response.ok) return null
  const data = await response.json() as { conversation?: unknown }
  return normalizeAiConversation(data.conversation)
}

async function updateAccountConversationTitle(id: string, title: string) {
  await fetch(`/api/ai/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

async function deleteAccountConversation(id: string) {
  await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
}

async function appendAccountMessages(id: string, messages: Message[], title?: string) {
  if (!messages.length) return
  await fetch(`/api/ai/conversations/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, title }),
  })
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
    queued: { color: 'var(--status-queued-text)', bg: 'var(--status-queued-bg)' },
    running: { color: 'var(--status-running-text)', bg: 'var(--status-running-bg)' },
    succeeded: { color: 'var(--status-success-text)', bg: 'var(--status-success-bg)' },
    failed: { color: 'var(--status-failed-text)', bg: 'var(--status-failed-bg)' },
    cancelled: { color: 'var(--status-queued-text)', bg: 'var(--status-queued-bg)' },
    timeout: { color: 'var(--status-warning-text)', bg: 'var(--status-warning-bg)' },
  }
  const style = map[status] ?? { color: 'var(--text-muted)', bg: 'var(--surface-soft)' }
  return { ...style, label: t.status[status as keyof typeof t.status] ?? (status || '-') }
}

function formatDate(value: unknown, locale: Locale) {
  return typeof value === 'string' ? new Date(value).toLocaleString(locale) : '-'
}

function renderTaskLinks(text: string) {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const matches = text.matchAll(taskRefPattern)
  for (const match of matches) {
    const taskId = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    nodes.push(
      <Link
        key={`${taskId}-${index}`}
        href={`/tasks/${taskId}`}
        className="font-mono underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
        style={{ color: 'var(--accent)' }}
      >
        {taskId}
      </Link>,
    )
    lastIndex = index + taskId.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length ? nodes : text
}

function hasInternalUuid(text: string) {
  internalUuidPattern.lastIndex = 0
  return internalUuidPattern.test(text)
}

function sanitizeVisibleText(text: string, t: Dictionary) {
  return text.replace(internalUuidPattern, t.ai.hiddenInternalId)
}

function sanitizeSuggestionPrompt(prompt: string, t: Dictionary) {
  if (!hasInternalUuid(prompt)) return prompt
  if (/任务|task/i.test(prompt)) return t.ai.sanitizedTaskStatusPrompt
  return sanitizeVisibleText(prompt, t)
}

function sanitizeSuggestionLabel(label: string, prompt: string, t: Dictionary) {
  if (!hasInternalUuid(`${label} ${prompt}`)) return label
  if (/任务|task/i.test(`${label} ${prompt}`)) return t.ai.sanitizedTaskStatusAction
  return sanitizeVisibleText(label, t)
}

function stripInlineMarkup(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

function renderInlineText(text: string, t: Dictionary) {
  return renderTaskLinks(stripInlineMarkup(sanitizeVisibleText(text, t)))
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
          const displayRef = taskRef(task)
          const environment = typeof task.environment === 'string' ? task.environment : '-'
          const status = typeof task.status === 'string' ? task.status : '-'
          const meta = statusMeta(status, t)
          const report = firstRecord(task.reports)
          const analysis = firstRecord(task.ai_analyses)
          const title = action.action === 'create_task' ? t.ai.taskCreated : t.ai.taskStatus
          const key = `${action.action}-${displayRef}-${index}`
          const card = (
            <div className="soft-panel rounded-xl overflow-hidden transition-colors" style={{ border: '1px solid var(--border)' }}>
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
                  <div className="mt-1 font-mono text-[11px] truncate" style={{ color: 'var(--accent)' }}>{displayRef}</div>
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
                  {typeof analysis.failure_reason === 'string' && <div className="mt-1" style={{ color: 'var(--status-failed-text)' }}>{analysis.failure_reason}</div>}
                  {typeof analysis.suggestion === 'string' && <div className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.suggestion}</div>}
                </div>
              )}
              {displayRef && (
                <div className="px-4 py-2 text-xs font-medium transition-colors group-hover:text-white" style={{ borderTop: '1px solid var(--border)', color: 'var(--accent)' }}>
                  {t.ai.openTaskDetail}
                </div>
              )}
            </div>
          )
          return displayRef
            ? <Link key={key} href={`/tasks/${displayRef}`} className="block group rounded-xl focus-visible:outline-none" style={{ outlineColor: 'var(--accent)' }}>{card}</Link>
            : <div key={key}>{card}</div>
        }

        const project = projectActionData(action)
        if (project) {
          const key = typeof project.key === 'string' ? project.key : '-'
          const name = typeof project.name === 'string' ? project.name : '-'
          const repo = typeof project.repo_url === 'string' && project.repo_url ? project.repo_url : '-'
          return (
            <div key={`${action.action}-${key}-${index}`} className="soft-panel rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-white">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-success-text)' }} />
                {t.ai.projectCreated}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><div style={{ color: 'var(--text-muted)' }}>{t.common.name}</div><div className="mt-1 text-white">{name}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>{t.common.key}</div><div className="mt-1 font-mono" style={{ color: 'var(--accent)' }}>{key}</div></div>
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

function TaskPickerCard({
  suggestion,
  t,
  disabled,
  onCreate,
}: {
  suggestion: AiSuggestion
  t: Dictionary
  disabled: boolean
  onCreate: (prompt: string) => void
}) {
  const projects = suggestion.projects ?? []
  const environments = suggestion.environments?.length ? suggestion.environments : ['dev', 'staging', 'prod']
  const [projectInput, setProjectInput] = useState(projects[0]?.name ?? '')
  const [projectKey, setProjectKey] = useState(projects[0]?.key ?? '')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const activeProject = projects.find(project => project.key === projectKey) ?? projects[0]
  const [suiteKey, setSuiteKey] = useState(activeProject?.suites[0]?.suiteKey ?? '')
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const [environment, setEnvironment] = useState(environments[0] ?? 'dev')
  const selectedProject = projects.find(project => project.key === projectKey && (project.name === projectInput || project.key === projectInput))
    ?? projects.find(project => project.name === projectInput || project.key === projectInput)
    ?? null
  const selectedSuite = selectedProject?.suites.find(suite => suite.suiteKey === suiteKey) ?? selectedProject?.suites[0]

  function setProject(project: AiTaskPickerProject) {
    setProjectKey(project.key)
    setProjectInput(project.name)
    setSuiteKey(project.suites[0]?.suiteKey ?? '')
    setProjectMenuOpen(false)
    setScopeMenuOpen(false)
  }

  function updateProjectInput(value: string) {
    setScopeMenuOpen(false)
    setProjectInput(value)
    const exact = projects.find(project => project.name === value || project.key === value)
    if (exact) {
      setProject(exact)
      return
    }
    setProjectKey('')
    setSuiteKey('')
    setScopeMenuOpen(false)
  }

  if (!projects.length) return null

  return (
    <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{t.ai.taskPickerTitle}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.ai.taskPickerHint}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <input
            className="field-input w-full px-3 py-2 pr-9 text-xs"
            value={projectInput}
            onChange={event => updateProjectInput(event.target.value)}
            onFocus={() => {
              setScopeMenuOpen(false)
              setProjectMenuOpen(true)
            }}
            onBlur={() => setTimeout(() => setProjectMenuOpen(false), 120)}
            placeholder={t.common.project}
            disabled={disabled}
          />
          <button
            type="button"
            disabled={disabled}
            onMouseDown={event => {
              event.preventDefault()
              setScopeMenuOpen(false)
              setProjectMenuOpen(open => !open)
            }}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md"
            aria-label={t.common.project}
            style={{ color: 'var(--text-muted)' }}
          >
            <span className={`block h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-current transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {projectMenuOpen ? (
            <div
              className="quiet-scrollbar absolute bottom-[calc(100%+4px)] left-0 right-0 z-20 max-h-56 overflow-y-auto rounded-lg p-1 shadow-xl"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}
            >
              {projects.map(project => (
                <button
                  key={project.key}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault()
                    setProject(project)
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left text-xs transition-colors"
                  style={project.key === projectKey ? { background: 'var(--surface-soft)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
                >
                  <span className="block truncate font-medium">{project.name}</span>
                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{project.key}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            disabled={disabled || !selectedProject}
            onMouseDown={event => {
              event.preventDefault()
              if (disabled || !selectedProject) return
              setProjectMenuOpen(false)
              setScopeMenuOpen(open => !open)
            }}
            onBlur={() => setTimeout(() => setScopeMenuOpen(false), 120)}
            className="field-input flex min-h-[34px] w-full items-center justify-between gap-2 px-3 py-2 pr-9 text-left text-xs disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={t.ai.taskPickerScope}
            style={!selectedProject ? { color: 'var(--text-muted)' } : undefined}
          >
            <span className="min-w-0 truncate">{selectedProject && selectedSuite ? selectedSuite.name : t.ai.taskPickerScope}</span>
          </button>
          <span className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-xs leading-none" style={{ color: 'var(--text-muted)' }}>
            <span className={`block h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-current transition-transform ${scopeMenuOpen ? 'rotate-180' : ''}`} />
          </span>
          {scopeMenuOpen && selectedProject ? (
            <div
              className="quiet-scrollbar absolute bottom-[calc(100%+4px)] left-0 right-0 z-20 max-h-36 overflow-y-scroll rounded-lg p-1 shadow-xl"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}
            >
              {selectedProject.suites.map(suite => (
                <button
                  key={suite.suiteKey}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault()
                    setSuiteKey(suite.suiteKey)
                    setScopeMenuOpen(false)
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left text-xs transition-colors"
                  style={suite.suiteKey === selectedSuite?.suiteKey ? { background: 'var(--surface-soft)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
                >
                  <span className="block truncate font-medium">{suite.name}</span>
                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{suite.suiteKey}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {environments.map(env => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvironment(env)}
              disabled={disabled}
              className="secondary-action rounded-lg px-2.5 py-2 text-xs"
              style={environment === env ? { borderColor: 'var(--accent)', color: 'var(--text-primary)' } : undefined}
            >
              {env}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled || !selectedProject || !selectedSuite}
        onClick={() => {
          if (!selectedProject || !selectedSuite) return
          onCreate(t.aiApi.createSuiteTaskPrompt(selectedProject.name, selectedSuite.name, environment))
        }}
        className="primary-action mt-3 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
      >
        {t.ai.taskPickerCreate}
      </button>
    </div>
  )
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function MessageContent({ content, hasActions, t }: { content: string; hasActions: boolean; t: Dictionary }) {
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
            <thead style={{ background: 'var(--surface-soft)' }}>
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
                    <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top" style={{ color: 'var(--text-secondary)' }}>{renderInlineText(cell, t)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^\s*[-*]\s+/.test(lines[index] ?? '')) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\s*[-*]\s+/, ''))
        index += 1
      }
      nodes.push(
        <div key={`list-${index}`} className="space-y-2">
          {items.map((item, itemIndex) => (
            <div key={`${item}-${itemIndex}`} className="flex gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="min-w-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{renderInlineText(item, t)}</span>
            </div>
          ))}
        </div>
      )
      continue
    }

    if (/^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(lines[index] ?? '')) {
      nodes.push(
        <div key={`heading-${index}`} className="pt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {renderInlineText(lines[index], t)}
        </div>
      )
      index += 1
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length
      && !(lines[index]?.includes('|') && isTableSeparator(lines[index + 1] ?? ''))
      && !/^\s*[-*]\s+/.test(lines[index] ?? '')
      && !/^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(lines[index] ?? '')
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    const text = paragraph.join('\n').trim()
    if (text) {
      nodes.push(
        <p key={`text-${index}`} className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {renderInlineText(text, t)}
        </p>
      )
    }
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
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
  const [renamingId, setRenamingId] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const remoteConversationIds = useRef<Set<string>>(new Set())

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    let cancelled = false
    const applyConversations = (items: Conversation[]) => {
      const next = items.length ? items : [newConversation(t.ai.newConversation)]
      setConversations(next)
      setActiveId(next[0].id)
      setMessages(next[0].messages)
      window.localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 30)))
    }
    const raw = window.localStorage.getItem(historyKey)
    let loadedLocal = false
    if (raw) {
      try {
        const stored = JSON.parse(raw) as Conversation[]
        if (Array.isArray(stored) && stored.length > 0) {
          const sorted = stored.map(normalizeAiConversation).filter(isConversation).sort((a, b) => b.updatedAt - a.updatedAt)
          window.localStorage.setItem(historyKey, JSON.stringify(sorted.slice(0, 30)))
          queueMicrotask(() => {
            if (!cancelled) applyConversations(sorted)
          })
          loadedLocal = true
        }
      } catch {
        window.localStorage.removeItem(historyKey)
      }
    }
    if (!loadedLocal) {
      queueMicrotask(() => {
        if (!cancelled) applyConversations([])
      })
    }
    fetchAccountConversations().then(async accountConversations => {
      if (cancelled || accountConversations === null) return
      if (accountConversations.length) {
        remoteConversationIds.current = new Set(accountConversations.map(item => item.id))
        applyConversations(accountConversations)
        return
      }
      const created = await createAccountConversation(t.ai.newConversation)
      if (cancelled || !created) return
      remoteConversationIds.current.add(created.id)
      applyConversations([created])
    })
    return () => { cancelled = true }
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

  async function createConversation() {
    const accountConversation = await createAccountConversation(t.ai.newConversation)
    const conversation = accountConversation ?? newConversation(t.ai.newConversation)
    if (accountConversation) remoteConversationIds.current.add(conversation.id)
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

  async function deleteConversation(id: string) {
    if (loading) return
    if (remoteConversationIds.current.has(id)) {
      deleteAccountConversation(id).catch(() => {})
      remoteConversationIds.current.delete(id)
    }
    const remaining = conversations.filter(c => c.id !== id)
    let next = remaining
    if (!next.length) {
      const accountConversation = await createAccountConversation(t.ai.newConversation)
      const conversation = accountConversation ?? newConversation(t.ai.newConversation)
      if (accountConversation) remoteConversationIds.current.add(conversation.id)
      next = [conversation]
    }
    window.localStorage.setItem(historyKey, JSON.stringify(next))
    setConversations(next)
    if (id === activeId) {
      setActiveId(next[0].id)
      setMessages(next[0].messages)
    }
  }

  function startRename(conversation: Conversation) {
    if (loading) return
    setRenamingId(conversation.id)
    setRenameValue(conversation.title)
  }

  function commitRename(id: string) {
    const title = renameValue.trim()
    if (!title) {
      setRenamingId('')
      return
    }
    setConversations(prev => {
      const next = prev.map(c => c.id === id ? { ...c, title, updatedAt: Date.now() } : c)
      window.localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 30)))
      return next
    })
    if (activeId === id) setMessages(prev => prev)
    if (remoteConversationIds.current.has(id)) updateAccountConversationTitle(id, title).catch(() => {})
    setRenamingId('')
  }

  function persistMessages(nextMessages: Message[], messagesToSync: Message[] = []) {
    setMessages(nextMessages)
    setConversations(prev => {
      const next = prev
        .map(c => {
          if (c.id !== activeId) return c
          const title = c.title === t.ai.newConversation && nextMessages[0]?.content ? titleFromMessage(nextMessages[0].content, t.ai.newConversation) : c.title
          if (messagesToSync.length && remoteConversationIds.current.has(c.id)) {
            appendAccountMessages(c.id, messagesToSync, title).catch(() => {})
          }
          return {
              ...c,
              messages: nextMessages,
              title,
              updatedAt: nextMessages.length ? Date.now() : c.updatedAt,
            }
        })
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
    setInput(sanitizeSuggestionPrompt(prompt, t))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function submitMessage(messageText = input) {
    const cleanInput = sanitizeSuggestionPrompt(messageText, t).trim()
    if (!cleanInput || loading) return
    const userMsg: Message = { role: 'user', content: cleanInput }
    const history = messages.map(({ role, content }) => ({ role, content }))
    const currentInput = cleanInput
    const withUser = [...messages, userMsg]
    persistMessages(withUser, [userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history, aiConfig: getAiSettings(), locale }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply ?? data.error ?? t.ai.requestFailed,
        actions: Array.isArray(data.actions) ? data.actions : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      }
      persistMessages([...withUser, assistantMsg], [assistantMsg])
    } catch {
      const assistantMsg: Message = { role: 'assistant', content: t.ai.retryFailed }
      persistMessages([...withUser, assistantMsg], [assistantMsg])
    } finally {
      setLoading(false)
    }
  }

  function applySuggestionAction(suggestion: AiSuggestion) {
    const prompt = sanitizeSuggestionPrompt(suggestion.prompt, t)
    if (suggestion.autoSubmit) {
      submitMessage(prompt)
      return
    }
    applySuggestion(prompt)
  }

  async function handleSend() {
    await submitMessage()
  }

  return (
    <div className="page-shell ai-page-shell flex flex-col gap-4">
      <section className="data-panel rounded-xl p-4 md:p-5">
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

      <div className={`ai-workspace-grid ${historyCollapsed ? 'is-history-collapsed' : ''}`}>
      <aside
        className="ai-side-panel data-panel hidden shrink-0 flex-col overflow-hidden rounded-xl xl:flex"
        aria-hidden={historyCollapsed}
      >
        <div className="ai-side-panel-body flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={createConversation}
              className="primary-action min-w-0 flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
            >
              + {t.ai.newConversation}
            </button>
          <button
            type="button"
            onClick={() => setHistoryCollapsed(value => !value)}
            className="ai-history-toggle is-collapse secondary-action flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm"
            title={t.ai.collapseHistory}
            aria-label={t.ai.collapseHistory}
          >
            <HistoryPanelIcon />
          </button>
        </div>
        <div className="quiet-scrollbar flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => (
            <div key={c.id} className="group relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => selectConversation(c)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') selectConversation(c)
                }}
                className="w-full rounded-lg px-3 py-2 text-left transition-colors"
                style={activeId === c.id
                  ? { background: 'var(--surface-soft)', border: '1px solid var(--border-light)' }
                  : { border: '1px solid transparent' }
                }
              >
                {renamingId === c.id ? (
                  <input
                    className="field-input w-full px-2 py-1 text-sm"
                    value={renameValue}
                    autoFocus
                    aria-label={t.ai.renameConversation}
                    onClick={event => event.stopPropagation()}
                    onChange={event => setRenameValue(event.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') commitRename(c.id)
                      if (event.key === 'Escape') setRenamingId('')
                    }}
                  />
                ) : (
                  <div className="truncate text-sm font-medium" style={{ color: activeId === c.id ? '#fff' : 'var(--text-secondary)' }}>{c.title}</div>
                )}
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {c.messages.length ? t.ai.messageCount(c.messages.length) : t.ai.emptyMessages}
                </div>
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => startRename(c)}
                  className="w-7 h-7 rounded-md"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}
                  title={t.ai.renameConversation}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  className="w-7 h-7 rounded-md"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}
                  title={t.ai.deleteConversation}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </aside>

      <div className="ai-chat-panel data-panel flex flex-col rounded-xl p-3 md:p-4">
      <div className="ai-chat-toolbar mb-4 flex items-center gap-3">
        {historyCollapsed && (
          <button
            type="button"
            onClick={() => setHistoryCollapsed(false)}
            className="ai-history-toggle is-expand secondary-action hidden h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm xl:flex"
            title={t.ai.expandHistory}
            aria-label={t.ai.expandHistory}
          >
            <HistoryPanelIcon />
          </button>
        )}
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
      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto space-y-4 pb-2">
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
                style={{ background: 'var(--action-primary-bg)', color: 'var(--action-primary-text)' }}>✦</div>
            )}
            <div className={`max-w-[min(54rem,calc(100vw-5.25rem))] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'rounded-tr-sm whitespace-pre-wrap' : 'rounded-tl-sm'}`}
              style={m.role === 'user'
                ? { background: 'var(--action-primary-bg)', color: 'var(--action-primary-text)' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              <ActionCards actions={m.actions} t={t} locale={locale} />
              {m.content && <MessageContent content={m.content} hasActions={Boolean(m.actions?.length)} t={t} />}
              {m.role === 'assistant' && Boolean(m.suggestions?.length) && (
                <>
                  {m.suggestions
                    ?.filter(suggestion => suggestion.kind === 'task_picker')
                    .map(suggestion => (
                      <TaskPickerCard
                        key={`picker-${suggestion.label}`}
                        suggestion={suggestion}
                        t={t}
                        disabled={loading}
                        onCreate={prompt => submitMessage(prompt)}
                      />
                    ))}
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.suggestions?.filter(suggestion => suggestion.kind !== 'task_picker').map(suggestion => (
                    <button
                      key={suggestion.prompt}
                      type="button"
                      onClick={() => applySuggestionAction(suggestion)}
                      disabled={loading}
                      className="chip-action rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors"
                    >
                      {sanitizeSuggestionLabel(suggestion.label, suggestion.prompt, t)}
                    </button>
                  ))}
                </div>
                </>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 mt-0.5"
              style={{ background: 'var(--action-primary-bg)', color: 'var(--action-primary-text)' }}>✦</div>
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
              <path d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535l-6 6a1 1 0 01-1.414-1.414l5.5-5.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/>
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
              <path d="M7 11V3M3 7l4-4 4 4" stroke="var(--accent-solid-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          {t.ai.footer} · <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Tab</kbd> {t.ai.switchParams}
        </p>
      </div>
      </div>

      <aside className="ai-template-panel quiet-scrollbar data-panel hidden rounded-xl p-4 overflow-y-auto xl:block">
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
