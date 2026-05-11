import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const host = '127.0.0.1'
const port = process.env.METEORTEST_SMOKE_PORT || '3002'
const baseUrl = process.env.METEORTEST_SMOKE_BASE_URL || `http://${host}:${port}`
const nextCli = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const previewAccessToken = 'public-preview-smoke-token'
const publicPreviewEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-preview-smoke-anon-key',
  METEORTEST_PUBLIC_PREVIEW: '1',
  METEORTEST_AGENT_DISABLED: '1',
  METEORTEST_SMOKE_NO_SUPABASE: '1',
  METEORTEST_PREVIEW_ACCESS_TOKEN: previewAccessToken,
  VERCEL: '1',
}

const forbiddenPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /DEEPSEEK_API_KEY/i,
  /METEORTEST_REPO_ROOT/i,
  /METEORTEST_AGENT_PYTHON/i,
  /METEORTEST_AGENT_INTERVAL/i,
  /agent\/config\.yaml/i,
  /C:\\Users\\/i,
  /\/Users\/[^/\s]+/i,
  /\/home\/[^/\s]+/i,
  /Traceback \(most recent call last\)/i,
  /Unhandled Runtime Error/i,
  /Error: spawn/i,
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function withPreviewAccess(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers)
  headers.set('x-meteortest-preview-token', previewAccessToken)
  return {
    ...options,
    headers,
  }
}

async function canReach(url: string) {
  try {
    const response = await fetchWithTimeout(url, withPreviewAccess())
    return response.status < 500
  } catch {
    return false
  }
}

function killProcessTree(child: ReturnType<typeof spawn> | null) {
  if (!child?.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/F', '/T'], { stdio: 'ignore' })
    return
  }
  try {
    child.kill('SIGTERM')
  } catch {}
}

async function startServer() {
  if (await canReach(`${baseUrl}/api/agent/status`)) {
    console.log(`Using existing server at ${baseUrl}`)
    return null
  }

  if (!existsSync(nextCli)) {
    throw new Error('Missing Next.js CLI. Run npm ci or npm install in apps/web first.')
  }

  console.log('Building public-preview smoke bundle...')
  await new Promise<void>((resolve, reject) => {
    const build = spawn(process.execPath, [nextCli, 'build'], {
      cwd: process.cwd(),
      env: publicPreviewEnv,
      stdio: 'inherit',
    })
    build.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`next build failed with exit code ${code}`))
    })
    build.on('error', reject)
  })

  const child = spawn(process.execPath, [nextCli, 'start', '-H', host, '-p', port], {
    cwd: process.cwd(),
    env: publicPreviewEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })

  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (await canReach(`${baseUrl}/api/agent/status`)) {
      return child
    }
    await sleep(1000)
  }

  killProcessTree(child)
  throw new Error(`Next dev server did not become ready at ${baseUrl}.\n${output.slice(-4000)}`)
}

function assertNoForbiddenText(label: string, text: string) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      throw new Error(`${label} contains forbidden public-preview text matching ${pattern}`)
    }
  }
}

async function assertAgentStatus() {
  const getResponse = await fetchWithTimeout(`${baseUrl}/api/agent/status`, withPreviewAccess())
  if (!getResponse.ok) {
    throw new Error(`/api/agent/status GET returned ${getResponse.status}`)
  }
  const getText = await getResponse.text()
  assertNoForbiddenText('/api/agent/status GET', getText)

  const status = JSON.parse(getText) as {
    available?: boolean
    running?: boolean
    started?: boolean
    pid?: number | null
    logFile?: string
    logTail?: string
    publicPreview?: boolean
  }
  if (status.available !== false || status.running !== false || status.started !== false) {
    throw new Error(`/api/agent/status must stay disabled in public preview: ${getText}`)
  }
  if (status.pid !== null || status.logFile || status.logTail) {
    throw new Error(`/api/agent/status exposed runtime details in public preview: ${getText}`)
  }
  if (status.publicPreview !== true) {
    throw new Error(`/api/agent/status did not report publicPreview=true: ${getText}`)
  }

  const postResponse = await fetchWithTimeout(`${baseUrl}/api/agent/status`, withPreviewAccess({ method: 'POST' }))
  if (!postResponse.ok) {
    throw new Error(`/api/agent/status POST returned ${postResponse.status}`)
  }
  const postText = await postResponse.text()
  assertNoForbiddenText('/api/agent/status POST', postText)
  const postStatus = JSON.parse(postText) as { started?: boolean; running?: boolean; pid?: number | null }
  if (postStatus.started !== false || postStatus.running !== false || postStatus.pid !== null) {
    throw new Error(`/api/agent/status POST must not start Agent in public preview: ${postText}`)
  }
}

async function assertExecutorsPage() {
  const response = await fetchWithTimeout(`${baseUrl}/executors`, withPreviewAccess({
    headers: { cookie: 'meteortest.locale=en' },
  }))
  if (!response.ok) {
    throw new Error(`/executors returned ${response.status}`)
  }
  const html = await response.text()
  assertNoForbiddenText('/executors', html)

  const requiredText = [
    'Local Agent disabled on public deployment',
    'The public Web console only acts as an operations UI',
  ]
  for (const text of requiredText) {
    if (!html.includes(text)) {
      throw new Error(`/executors is missing public-preview boundary text: ${text}`)
    }
  }
}

async function assertPreviewAccessGate() {
  const apiResponse = await fetchWithTimeout(`${baseUrl}/api/agent/status`)
  if (apiResponse.status !== 401) {
    throw new Error(`/api/agent/status must require preview access when a token is configured: ${apiResponse.status}`)
  }

  const pageResponse = await fetchWithTimeout(`${baseUrl}/executors`, { redirect: 'manual' })
  if (![302, 307, 308].includes(pageResponse.status)) {
    throw new Error(`/executors must redirect to preview access when a token is configured: ${pageResponse.status}`)
  }
  const location = pageResponse.headers.get('location') ?? ''
  if (!location.includes('/preview-access')) {
    throw new Error(`/executors redirected to an unexpected location: ${location}`)
  }
}

const child = await startServer()
try {
  await assertPreviewAccessGate()
  await assertAgentStatus()
  await assertExecutorsPage()
  console.log('Public preview smoke checks passed.')
} finally {
  killProcessTree(child)
}
