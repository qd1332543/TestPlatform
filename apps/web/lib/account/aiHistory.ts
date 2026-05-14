export type AiTaskPickerSuite = { name: string; suiteKey: string }
export type AiTaskPickerProject = { name: string; key: string; suites: AiTaskPickerSuite[] }
export type AiSuggestion = {
  label: string
  prompt: string
  autoSubmit?: boolean
  kind?: 'task_picker'
  projects?: AiTaskPickerProject[]
  environments?: string[]
}
export type AiToolResult = { ok: boolean; action?: string; data?: unknown; error?: string }
export type AiMessageRole = 'user' | 'assistant'
export type AiMessage = {
  id?: string
  role: AiMessageRole
  content: string
  suggestions?: AiSuggestion[]
  actions?: AiToolResult[]
  createdAt?: string
}
export type AiConversation = {
  id: string
  title: string
  messages: AiMessage[]
  updatedAt: number
  createdAt?: string
}

export const aiHistoryStorageKey = 'meteortest.ai.conversations.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeSuggestions(value: unknown): AiSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined
  const suggestions = value
    .map(item => {
      if (!isRecord(item)) return null
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      if (!label || !prompt) return null
      const projects = Array.isArray(item.projects)
        ? item.projects
          .map(project => {
            if (!isRecord(project)) return null
            const name = typeof project.name === 'string' ? project.name.trim() : ''
            const key = typeof project.key === 'string' ? project.key.trim() : ''
            const suites = Array.isArray(project.suites)
              ? project.suites
                .map(suite => {
                  if (!isRecord(suite)) return null
                  const suiteName = typeof suite.name === 'string' ? suite.name.trim() : ''
                  const suiteKey = typeof suite.suiteKey === 'string' ? suite.suiteKey.trim() : ''
                  return suiteName && suiteKey ? { name: suiteName, suiteKey } : null
                })
                .filter(Boolean) as AiTaskPickerSuite[]
              : []
            return name && key && suites.length ? { name, key, suites } : null
          })
          .filter(Boolean) as AiTaskPickerProject[]
        : undefined
      const environments = Array.isArray(item.environments) ? item.environments.filter(env => typeof env === 'string') as string[] : undefined
      return {
        label,
        prompt,
        autoSubmit: item.autoSubmit === true,
        kind: item.kind === 'task_picker' ? 'task_picker' : undefined,
        projects,
        environments,
      }
    })
    .filter(Boolean) as AiSuggestion[]
  return suggestions.length ? suggestions : undefined
}

function normalizeActions(value: unknown): AiToolResult[] | undefined {
  if (!Array.isArray(value)) return undefined
  const actions = value.filter(isRecord).map(item => ({
    ok: item.ok === true,
    action: typeof item.action === 'string' ? item.action : undefined,
    data: item.data,
    error: typeof item.error === 'string' ? item.error : undefined,
  }))
  return actions.length ? actions : undefined
}

export function normalizeAiMessage(value: unknown): AiMessage | null {
  if (!isRecord(value)) return null
  const role = value.role === 'user' || value.role === 'assistant' ? value.role : null
  const content = typeof value.content === 'string' ? value.content : ''
  if (!role || !content) return null
  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    role,
    content,
    suggestions: normalizeSuggestions(value.suggestions),
    actions: normalizeActions(value.actions),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
  }
}

export function normalizeAiConversation(value: unknown): AiConversation | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id : ''
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const messages = Array.isArray(value.messages) ? value.messages.map(normalizeAiMessage).filter(Boolean) as AiMessage[] : []
  const updatedAt = typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now()
  if (!id || !title) return null
  return { id, title, messages, updatedAt, createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined }
}

export function messageToRow(userId: string, conversationId: string, message: AiMessage) {
  return {
    user_id: userId,
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
    suggestions: message.suggestions ?? null,
    actions: message.actions ?? null,
  }
}

export function rowToMessage(row: Record<string, unknown>): AiMessage {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: typeof row.content === 'string' ? row.content : '',
    suggestions: normalizeSuggestions(row.suggestions),
    actions: normalizeActions(row.actions),
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

export function rowToConversation(row: Record<string, unknown>, messages: AiMessage[] = []): AiConversation {
  const updatedAtRaw = typeof row.updated_at === 'string' ? Date.parse(row.updated_at) : Date.now()
  return {
    id: typeof row.id === 'string' ? row.id : '',
    title: typeof row.title === 'string' ? row.title : '',
    messages,
    updatedAt: Number.isFinite(updatedAtRaw) ? updatedAtRaw : Date.now(),
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}
