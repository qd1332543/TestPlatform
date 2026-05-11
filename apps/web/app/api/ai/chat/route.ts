import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { demoExecutors, demoProjects, demoTasks, isLocalDemo } from '@/lib/localDemo'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ToolResult = { ok: boolean; action?: string; data?: unknown; error?: string }
type AiConfig = { aiModel?: string; aiBaseUrl?: string }
type Suggestion = { label: string; prompt: string }
type SuiteSnapshot = { name: string; suite_key: string; type?: string }
type ProjectSnapshot = { name: string; key: string; test_suites?: SuiteSnapshot[] | null }
type NamedRecord = { name?: string; key?: string; suite_key?: string }
type NamedRelation = NamedRecord | NamedRecord[] | null
type TaskSnapshot = {
  id?: string
  status?: string
  environment?: string
  projects?: NamedRelation
  test_suites?: NamedRelation
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase()
}

function sameText(a?: string | null, b?: string | null) {
  return Boolean(normalize(a) && normalize(a) === normalize(b))
}

async function getPlatformSnapshot() {
  if (isLocalDemo()) {
    return { projects: demoProjects, recentTasks: demoTasks, executors: demoExecutors }
  }

  const supabase = serviceClient()
  const [{ data: projects }, { data: tasks }, { data: executors }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, key, name, repo_url, description, test_suites(id, suite_key, name, type, command), app_builds(id, platform, version, build_number)')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('tasks')
      .select('id, status, environment, created_at, projects(name, key), test_suites(name, suite_key), reports(summary, log_url), ai_analyses(failure_reason, suggestion, flaky_probability)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('executors')
      .select('id, name, type, status, capabilities, last_heartbeat_at')
      .order('status'),
  ])

  return { projects: projects ?? [], recentTasks: tasks ?? [], executors: executors ?? [] }
}

function getTaskId(action: ToolResult) {
  if (!action.ok || !['create_task', 'get_task_detail'].includes(action.action ?? '') || !action.data || typeof action.data !== 'object') return null
  const data = action.data as { id?: unknown }
  return typeof data.id === 'string' ? data.id : null
}

function extractTaskId(text: string) {
  return text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]
}

function uniqueSuggestions(suggestions: Suggestion[]) {
  const seen = new Set<string>()
  return suggestions.filter(suggestion => {
    if (seen.has(suggestion.prompt)) return false
    seen.add(suggestion.prompt)
    return true
  }).slice(0, 6)
}

function relationLabel(value: NamedRelation) {
  const item = Array.isArray(value) ? value[0] : value
  return item?.name ?? item?.key ?? item?.suite_key ?? ''
}

function taskLabel(task: TaskSnapshot) {
  const project = relationLabel(task.projects ?? null)
  const suite = relationLabel(task.test_suites ?? null)
  return [project, suite].filter(Boolean).join(' / ') || task.id?.slice(0, 8) || '任务'
}

function buildTaskListSuggestions(snapshot: { recentTasks?: TaskSnapshot[] }) {
  const tasks = snapshot.recentTasks ?? []
  const first = tasks[0]
  const failed = tasks.find(task => ['failed', 'timeout'].includes(task.status ?? ''))
  const running = tasks.find(task => ['queued', 'running'].includes(task.status ?? ''))

  const suggestions: Suggestion[] = []
  if (first?.id) {
    suggestions.push({
      label: `查看 ${taskLabel(first)} 详情`,
      prompt: `查询任务 ${first.id} 的执行状态和最新报告`,
    })
  }
  if (failed?.id) {
    suggestions.push({
      label: `分析失败任务`,
      prompt: `分析任务 ${failed.id} 的报告、失败原因和改进建议`,
    })
    const project = relationLabel(failed.projects ?? null)
    const suite = relationLabel(failed.test_suites ?? null)
    if (project && suite) {
      suggestions.push({
        label: `重跑失败套件`,
        prompt: `请帮我重新创建 ${project} 项目的 ${suite} 套件在 ${failed.environment ?? 'dev'} 环境的测试任务`,
      })
    }
  }
  if (running?.id && running.id !== first?.id) {
    suggestions.push({
      label: `跟踪运行中任务`,
      prompt: `查询任务 ${running.id} 的执行状态和最新报告`,
    })
  }
  suggestions.push(
    { label: '查看执行器状态', prompt: '列出当前所有执行器状态和最近心跳' },
    { label: '分析今日报告', prompt: '分析今天的测试执行情况和主要失败原因' },
  )

  return uniqueSuggestions(suggestions)
}

function buildSuiteTaskSuggestions(text: string, snapshot: { projects: ProjectSnapshot[] }) {
  const matchedProjects = snapshot.projects.filter(project => {
    const name = normalize(project.name)
    const key = normalize(project.key)
    return Boolean((name && text.includes(name)) || (key && text.includes(key)))
  })
  const projects = matchedProjects.length ? matchedProjects : snapshot.projects.slice(0, 2)

  return projects.flatMap(project => {
    const matchedSuites = (project.test_suites ?? []).filter(suite => {
      const name = normalize(suite.name)
      const key = normalize(suite.suite_key)
      return Boolean((name && text.includes(name)) || (key && text.includes(key)))
    })
    const suites = matchedSuites.length ? matchedSuites : (project.test_suites ?? []).slice(0, 3)
    return suites.flatMap(suite => [
      {
        label: `创建 ${project.name} / ${suite.name} / dev`,
        prompt: `请帮我创建 ${project.name} 项目的 ${suite.name} 套件在 dev 环境的测试任务`,
      },
      {
        label: `创建 ${project.name} / ${suite.name} / staging`,
        prompt: `请帮我创建 ${project.name} 项目的 ${suite.name} 套件在 staging 环境的测试任务`,
      },
    ])
  })
}

function buildSuggestions(message: string, reply: string, snapshot: { projects: ProjectSnapshot[]; recentTasks?: TaskSnapshot[] }, actions: ToolResult[], history: ChatMessage[] = []): Suggestion[] {
  const historyText = normalize(history.slice(-4).map(item => item.content).join(' ')) ?? ''
  const text = normalize(`${historyText} ${message} ${reply}`) ?? ''
  const currentText = normalize(`${message} ${reply}`) ?? ''
  const activeTaskId = actions.map(getTaskId).find(Boolean) ?? extractTaskId(text)
  const hasCreatedTask = actions.some(action => action.ok && action.action === 'create_task')
  const hasTaskDetail = actions.some(action => action.ok && action.action === 'get_task_detail')
  const latestTaskId = activeTaskId ?? snapshot.recentTasks?.[0]?.id

  if (hasCreatedTask && activeTaskId) {
    return [
      { label: '查询这个任务状态', prompt: `查询任务 ${activeTaskId} 的执行状态和最新报告` },
      { label: '查看最近任务', prompt: '列出最近 10 个测试任务的状态' },
      { label: '分析今日报告', prompt: '分析今天的测试执行情况和主要失败原因' },
    ]
  }

  if (hasTaskDetail && activeTaskId) {
    return [
      { label: '分析这个任务结果', prompt: `分析任务 ${activeTaskId} 的报告、失败原因和改进建议` },
      { label: '查看相关套件', prompt: `查看任务 ${activeTaskId} 对应项目下的测试套件` },
      { label: '查看最近任务', prompt: '列出最近 10 个测试任务的状态' },
    ]
  }

  if (actions.some(action => action.ok && action.action === 'create_project')) {
    return [
      { label: '查看项目套件', prompt: '列出这个项目下所有测试套件' },
      { label: '导入套件说明', prompt: '告诉我如何为这个项目导入测试套件' },
      { label: '创建测试任务', prompt: '帮我为这个项目选择套件并创建一个 dev 环境测试任务' },
    ]
  }

  if (/(最近|latest|recent|列表|list|列出|查看).*(任务|task)|任务.*(列表|list|最近|latest|recent)/.test(currentText)) {
    return buildTaskListSuggestions(snapshot)
  }

  if (/套件|suite|测试集|用例集/.test(text)) {
    return uniqueSuggestions([
      ...buildSuiteTaskSuggestions(text, snapshot),
      { label: '查看执行器状态', prompt: '列出当前所有执行器状态和能力标签' },
    ])
  }

  if (/(任务|状态|运行|结果|queued|running|succeeded|failed|timeout)/.test(currentText) && latestTaskId) {
    return [
      { label: '查看任务详情', prompt: `查询任务 ${latestTaskId} 的执行状态和最新报告` },
      { label: '分析任务结果', prompt: `分析任务 ${latestTaskId} 的报告、失败原因和改进建议` },
      { label: '查看执行器状态', prompt: '列出当前所有执行器状态和最近心跳' },
    ]
  }

  if (/失败|failed|报告|report|分析/.test(currentText)) {
    return [
      { label: '查看失败任务', prompt: '查询最近失败的任务，列出失败原因和修复建议' },
      { label: '执行器状态', prompt: '列出当前所有执行器状态和最近心跳' },
      { label: '今日测试概览', prompt: '总结今天的测试成功率、失败数和平均耗时' },
    ]
  }

  const wantsTask = /任务|执行|运行|触发|创建|新建|套件|suite/.test(text)
  if (!wantsTask) return []

  return uniqueSuggestions(buildSuiteTaskSuggestions(text, snapshot))
}

function finalReplyForActions(actions: ToolResult[]) {
  if (actions.some(action => action.ok && action.action === 'create_task')) {
    return '测试任务已创建成功，已进入执行队列。'
  }
  if (actions.some(action => action.ok && action.action === 'create_project')) {
    return '项目已创建成功。'
  }
  if (actions.some(action => action.ok && action.action === 'get_task_detail')) {
    return '这是任务的最新状态。'
  }
  return null
}

async function getTaskDetail(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = String(args.task_id ?? args.id ?? '').trim()
  if (!taskId) return { ok: false, error: '查询任务需要 task_id。' }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, project_id, suite_id, environment, status, created_at, started_at, finished_at, projects(name, key), test_suites(name, suite_key), reports(summary, log_url, allure_url, created_at), ai_analyses(failure_reason, impact, suggestion, flaky_probability)')
    .eq('id', taskId)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, action: 'get_task_detail', data }
}

async function createProject(args: Record<string, unknown>): Promise<ToolResult> {
  const key = String(args.key ?? '').trim()
  const name = String(args.name ?? '').trim()
  const repoUrl = String(args.repo_url ?? '').trim()
  const description = String(args.description ?? '').trim()
  if (!key || !name) return { ok: false, error: '创建项目需要 name 和 key。' }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ key, name, repo_url: repoUrl, description: description || null })
    .select('id, key, name, repo_url, description')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, action: 'create_project', data }
}

async function createTask(args: Record<string, unknown>): Promise<ToolResult> {
  const supabase = serviceClient()
  const projectId = String(args.project_id ?? '').trim()
  const projectName = String(args.project_name ?? '').trim()
  const suiteId = String(args.suite_id ?? '').trim()
  const suiteName = String(args.suite_name ?? '').trim()
  const environment = String(args.environment ?? 'dev').trim()
  const appBuildId = String(args.app_build_id ?? '').trim()

  let resolvedProjectId = projectId
  if (!resolvedProjectId && projectName) {
    const { data: projects, error } = await supabase.from('projects').select('id, key, name')
    if (error) return { ok: false, error: error.message }
    const matches = (projects ?? []).filter(p => sameText(p.name, projectName) || sameText(p.key, projectName))
    if (matches.length !== 1) {
      return {
        ok: false,
        error: matches.length > 1 ? '找到多个匹配项目，请提供项目 key。' : `没有找到项目：${projectName}`,
      }
    }
    resolvedProjectId = matches[0].id
  }

  if (!resolvedProjectId) return { ok: false, error: '创建任务需要 project_id 或 project_name。' }

  let resolvedSuiteId = suiteId
  if (!resolvedSuiteId && suiteName) {
    const { data: suites, error } = await supabase
      .from('test_suites')
      .select('id, suite_key, name, project_id')
      .eq('project_id', resolvedProjectId)
    if (error) return { ok: false, error: error.message }
    const matches = (suites ?? []).filter(s => sameText(s.name, suiteName) || sameText(s.suite_key, suiteName))
    if (matches.length !== 1) {
      return {
        ok: false,
        error: matches.length > 1 ? '找到多个匹配套件，请提供 suite_key。' : `没有找到套件：${suiteName}`,
      }
    }
    resolvedSuiteId = matches[0].id
  }

  if (!resolvedSuiteId) return { ok: false, error: '创建任务需要 suite_id 或 suite_name。' }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: resolvedProjectId,
      suite_id: resolvedSuiteId,
      environment: environment || 'dev',
      status: 'queued',
      app_build_id: appBuildId || null,
      created_by: 'ai',
    })
    .select('id, project_id, suite_id, environment, status, created_at, projects(name, key), test_suites(name, suite_key)')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, action: 'create_task', data }
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_platform_snapshot',
      description: '查询当前测试平台的项目、测试套件、构建、最近任务和执行器状态。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: '新增测试项目。缺少项目名称或 key 时不要调用，应先向用户确认。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '项目名称' },
          key: { type: 'string', description: '项目唯一标识，只能是简短英文、数字或连字符更合适' },
          repo_url: { type: 'string', description: '代码仓库地址，可为空' },
          description: { type: 'string', description: '项目描述，可为空' },
        },
        required: ['name', 'key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: '创建测试任务。可以用项目名称/key 和套件名称/key 解析，也可以直接传 id。',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          project_name: { type: 'string', description: '项目名称或项目 key' },
          suite_id: { type: 'string' },
          suite_name: { type: 'string', description: '套件名称或 suite_key' },
          environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
          app_build_id: { type: 'string', description: '可选构建产物 id' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task_detail',
      description: '按任务 ID 查询任务执行状态、报告摘要和 AI 分析。',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: '任务 UUID' },
        },
        required: ['task_id'],
      },
    },
  },
]

async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === 'get_platform_snapshot') return { ok: true, action: name, data: await getPlatformSnapshot() }
  if (name === 'create_project') return createProject(args)
  if (name === 'create_task') return createTask(args)
  if (name === 'get_task_detail') return getTaskDetail(args)
  return { ok: false, error: `未知工具：${name}` }
}

export async function POST(req: NextRequest) {
  const { message, history, aiConfig } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'empty message' }, { status: 400 })
  if (!process.env.DEEPSEEK_API_KEY) return NextResponse.json({ error: '缺少 DEEPSEEK_API_KEY' }, { status: 500 })
  const config = (aiConfig ?? {}) as AiConfig
  const model = config.aiModel?.trim() || 'deepseek-v4-pro'
  const baseURL = config.aiBaseUrl?.trim()
    ? config.aiBaseUrl.trim().replace(/\/$/, '').replace(/\/v1$/, '') + '/v1'
    : 'https://api.deepseek.com/v1'

  const snapshot = await getPlatformSnapshot()
  const systemPrompt = `你是 MeteorTest 的 AI 测试中枢。你可以回答测试平台问题，也可以通过工具新增项目、创建测试任务、查询项目/套件/最近任务/任务详情。
规则：
1. 回复使用用户的语言，默认中文，语气简洁。
2. 创建项目必须确认 name 和 key；创建任务必须确认项目、测试套件和环境。
3. 用户询问任务状态、运行结果、报告或分析且给出任务 ID 时，调用 get_task_detail。
4. 工具执行成功后，明确给出创建结果和下一步入口。
5. 信息不足时先追问，不要猜测关键字段。
6. 最近平台快照如下，必要时可再调用 get_platform_snapshot 获取更完整数据：
${JSON.stringify(snapshot, null, 2)}`

  const chatHistory = (Array.isArray(history) ? history : [])
    .filter((m: ChatMessage) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m: ChatMessage) => ({ role: m.role, content: m.content }))

  const openai = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL })
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: message },
  ]
  const actions: ToolResult[] = []

  for (let step = 0; step < 4; step += 1) {
    const response = await openai.chat.completions.create({
      model,
      max_tokens: 1200,
      messages,
      tools,
      tool_choice: 'auto',
    })

    const choice = response.choices[0].message
    messages.push(choice)

    if (!choice.tool_calls?.length) {
      const reply = choice.content ?? ''
      return NextResponse.json({ reply, actions, suggestions: buildSuggestions(message, reply, snapshot, actions, chatHistory) })
    }

    for (const call of choice.tool_calls) {
      if (call.type !== 'function') continue
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        args = {}
      }
      const result = await runTool(call.function.name, args)
      actions.push(result)
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }

    const finalReply = finalReplyForActions(actions)
    if (finalReply) {
      return NextResponse.json({ reply: finalReply, actions, suggestions: buildSuggestions(message, finalReply, snapshot, actions, chatHistory) })
    }
  }

  const reply = '我执行了多轮工具调用，但还没有得到最终答复。请缩小一下请求范围。'
  return NextResponse.json({ reply, actions, suggestions: buildSuggestions(message, reply, snapshot, actions, chatHistory) })
}
