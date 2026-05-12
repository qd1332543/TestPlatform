type ProjectRow = {
  id: string
  key: string
  name: string
  test_suites?: { id: string; suite_key: string; name: string }[]
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const projectKey = process.env.METEORTEST_LOOP_PROJECT_KEY || 'yunlu-ios'
const suiteKey = process.env.METEORTEST_LOOP_SUITE_KEY || 'smoke'
const environment = process.env.METEORTEST_LOOP_ENVIRONMENT || 'dev'
const timeoutSeconds = Number(process.env.METEORTEST_LOOP_TIMEOUT_SECONDS || '600')

function requireEnv() {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`)
}

function headers() {
  return {
    apikey: serviceRoleKey!,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

async function supabase(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${text}`)
  }
  return response
}

async function findSuite() {
  const select = encodeURIComponent('id,key,name,test_suites(id,suite_key,name)')
  const key = encodeURIComponent(`eq.${projectKey}`)
  const response = await supabase(`/rest/v1/projects?select=${select}&key=${key}&limit=1`)
  const projects = await response.json() as ProjectRow[]
  const project = projects[0]
  if (!project) throw new Error(`Project not found: ${projectKey}`)
  const suite = (project.test_suites ?? []).find(item => item.suite_key === suiteKey || item.name === suiteKey)
  if (!suite) throw new Error(`Suite not found under ${projectKey}: ${suiteKey}`)
  return { project, suite }
}

async function createTask(projectId: string, suiteId: string) {
  const response = await supabase('/rest/v1/tasks?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      project_id: projectId,
      suite_id: suiteId,
      environment,
      status: 'queued',
      created_by: 'private-loop-script',
      parameters: {
        source: 'web-console',
        private_agent_preview: true,
      },
    }),
  })
  const rows = await response.json() as { id: string }[]
  return rows[0]?.id
}

async function readTask(taskId: string) {
  const select = encodeURIComponent('id,status,started_at,finished_at,reports(summary,log_url,allure_url,created_at)')
  const response = await supabase(`/rest/v1/tasks?select=${select}&id=eq.${taskId}&limit=1`)
  const rows = await response.json() as {
    id: string
    status: string
    started_at: string | null
    finished_at: string | null
    reports?: { summary?: string; log_url?: string; allure_url?: string }[]
  }[]
  return rows[0]
}

async function main() {
  requireEnv()
  const { project, suite } = await findSuite()
  const taskId = await createTask(project.id, suite.id)
  if (!taskId) throw new Error('Task creation returned no task id.')

  console.log(`Created task ${taskId} for ${project.key}/${suite.suite_key} (${environment}).`)
  console.log('Start the private Local Agent if it is not already running, then keep this script open.')

  const deadline = Date.now() + timeoutSeconds * 1000
  while (Date.now() < deadline) {
    const task = await readTask(taskId)
    const report = task?.reports?.[0]
    console.log(`status=${task?.status ?? 'unknown'} started=${task?.started_at ?? '-'} finished=${task?.finished_at ?? '-'}`)
    if (task && ['succeeded', 'failed', 'cancelled', 'timeout'].includes(task.status)) {
      console.log(`report_summary=${report?.summary ?? '-'}`)
      console.log(`log_url=${report?.log_url ?? '-'}`)
      console.log(`allure_url=${report?.allure_url ?? '-'}`)
      process.exit(task.status === 'succeeded' ? 0 : 1)
    }
    await new Promise(resolve => setTimeout(resolve, 10000))
  }

  throw new Error(`Timed out after ${timeoutSeconds}s waiting for task ${taskId}.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
