import { spawn } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const repoRoot = process.env.TEST_PLATFORM_REPO_ROOT || path.resolve(/* turbopackIgnore: true */ process.cwd(), '../..')
const runtimeDir = path.join(repoRoot, '.test-platform-agent')
const pidFile = path.join(runtimeDir, 'agent.pid')
const logFile = path.join(runtimeDir, 'agent-web.log')

function readPid() {
  if (!existsSync(pidFile)) return null
  const pid = Number(readFileSync(pidFile, 'utf8').trim())
  return Number.isFinite(pid) ? pid : null
}

function isRunning(pid: number | null) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function tailLog() {
  if (!existsSync(logFile)) return ''
  const content = readFileSync(logFile, 'utf8')
  return content.split('\n').slice(-20).join('\n').trim()
}

function status() {
  const pid = readPid()
  return {
    running: isRunning(pid),
    pid,
    logFile,
    logTail: tailLog(),
  }
}

export async function GET() {
  return NextResponse.json(status())
}

export async function POST() {
  const current = status()
  if (current.running) return NextResponse.json({ ...current, started: false })

  mkdirSync(runtimeDir, { recursive: true })
  const python = process.env.TEST_PLATFORM_AGENT_PYTHON || path.join(repoRoot, 'agent/.venv/bin/python')
  const out = openSync(logFile, 'a')
  const child = spawn(
    python,
    ['-m', 'agent.agent', '--config', 'agent/config.yaml', '--interval', process.env.TEST_PLATFORM_AGENT_INTERVAL || '10'],
    {
      cwd: repoRoot,
      detached: true,
      env: process.env,
      stdio: ['ignore', out, out],
    },
  )

  writeFileSync(pidFile, String(child.pid))
  child.unref()

  return NextResponse.json({
    running: true,
    started: true,
    pid: child.pid,
    logFile,
    logTail: tailLog(),
  })
}
