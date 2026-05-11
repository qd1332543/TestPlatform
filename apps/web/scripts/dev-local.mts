import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import { get } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const host = '127.0.0.1'
const port = '3000'
const previewUrl = `http://${host}:${port}/`
const healthUrl = `http://${host}:${port}/ai`
const nextDir = join(webRoot, '.next')
const pidFile = join(nextDir, 'dev-local.pid')
const logFile = join(nextDir, 'dev-local.log')

function run(command: string, args: string[]) {
  return execFileSync(command, args, {
    cwd: webRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
}

function pidsListeningOnPort() {
  if (process.platform === 'win32') {
    const output = run('netstat', ['-ano'])
    const matcher = new RegExp(`(?:${host.replaceAll('.', '\\.')}|0\\.0\\.0\\.0|\\[::\\]|::):${port}\\s+`, 'i')
    return [
      ...new Set(
        output
          .split(/\r?\n/)
          .filter(line => matcher.test(line) && line.includes('LISTENING'))
          .map(line => line.trim().split(/\s+/).at(-1))
          .filter(Boolean) as string[],
      ),
    ]
  }

  try {
    const output = run('lsof', ['-ti', `tcp:${port}`])
    return [...new Set(output.split(/\s+/).filter(Boolean))]
  } catch {
    return []
  }
}

function killPid(pid: string) {
  if (pid === String(process.pid)) return

  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', pid, '/F', '/T'], {
      cwd: webRoot,
      stdio: 'ignore',
    })
    return
  }

  process.kill(Number(pid), 'SIGTERM')
}

async function waitForPortToFree() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (pidsListeningOnPort().length === 0) return
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}

function requestStatus(url: string) {
  return new Promise<number>((resolve) => {
    const request = get(url, (response) => {
      response.resume()
      response.on('end', () => resolve(response.statusCode ?? 0))
    })

    request.setTimeout(2000, () => {
      request.destroy()
      resolve(0)
    })

    request.on('error', () => resolve(0))
  })
}

async function waitForHealthyServer() {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const status = await requestStatus(healthUrl)
    if (status >= 200 && status < 500) return
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error(`MeteorTest WebUI local preview did not become healthy. Check ${logFile}`)
}

const existingPids = pidsListeningOnPort()
for (const pid of existingPids) {
  console.log(`Stopping existing MeteorTest WebUI preview on ${host}:${port} (pid ${pid})`)
  killPid(pid)
}

await waitForPortToFree()

const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next'
const nextPath = join(webRoot, 'node_modules', '.bin', nextBin)

if (!existsSync(nextPath)) {
  console.error('Missing Next.js binary. Run `npm install` in apps/web before `npm run dev:local`.')
  process.exit(1)
}

mkdirSync(nextDir, { recursive: true })

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-preview-anon-key',
  METEORTEST_PUBLIC_PREVIEW: process.env.METEORTEST_PUBLIC_PREVIEW || '1',
  METEORTEST_AGENT_DISABLED: process.env.METEORTEST_AGENT_DISABLED || '1',
  METEORTEST_LOCAL_DEMO: process.env.METEORTEST_LOCAL_DEMO || '1',
}

delete env.METEORTEST_PREVIEW_ACCESS_TOKEN

const logFd = openSync(logFile, 'a')
const child = spawn(nextPath, ['dev', '-H', host, '-p', port], {
  cwd: webRoot,
  detached: true,
  env,
  shell: process.platform === 'win32',
  stdio: ['ignore', logFd, logFd],
})

child.unref()
writeFileSync(pidFile, String(child.pid ?? ''), 'utf8')

await waitForHealthyServer()

console.log(`MeteorTest WebUI local preview is running at ${previewUrl}`)
console.log(`AI page: ${previewUrl}ai`)
console.log(`Logs: ${logFile}`)
