import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const publicPreview = process.env.METEORTEST_PUBLIC_PREVIEW === '1'
const agentDisabled = publicPreview || process.env.VERCEL === '1' || process.env.METEORTEST_AGENT_DISABLED === '1'

type AgentRuntimeState = {
  pid: number | null
}

type ProcessWithBuiltins = NodeJS.Process & {
  getBuiltinModule?: (id: 'child_process') => typeof import('child_process')
}

const runtimeState = globalThis as typeof globalThis & {
  __meteorTestAgent?: AgentRuntimeState
}

function agentState() {
  runtimeState.__meteorTestAgent ??= { pid: null }
  return runtimeState.__meteorTestAgent
}

function agentRepoRoot() {
  return process.env.METEORTEST_REPO_ROOT || ''
}

function disabledStatus() {
  return {
    available: false,
    running: false,
    started: false,
    pid: null,
    logFile: '',
    logTail: '',
    publicPreview,
    disabledReason: 'Local Agent control is disabled in public Web deployments. Run the Agent privately and let it poll Supabase.',
  }
}

function unavailableStatus(disabledReason: string) {
  return {
    available: false,
    running: false,
    started: false,
    pid: null,
    logFile: '',
    logTail: '',
    disabledReason,
  }
}

function readPid() {
  const pid = agentState().pid
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

function status() {
  if (agentDisabled) return disabledStatus()
  if (!agentRepoRoot()) {
    return unavailableStatus('Local Agent control requires METEORTEST_REPO_ROOT in the Web process environment.')
  }
  const pid = readPid()
  return {
    available: true,
    running: isRunning(pid),
    pid,
    logFile: '',
    logTail: '',
  }
}

export async function GET() {
  return NextResponse.json(status())
}

export async function POST() {
  if (agentDisabled) return NextResponse.json(disabledStatus())

  const current = status()
  if (current.running) return NextResponse.json({ ...current, started: false })
  if (!current.available) return NextResponse.json(current, { status: 400 })

  const childProcess = (process as ProcessWithBuiltins).getBuiltinModule?.('child_process')
  if (!childProcess) {
    return NextResponse.json(unavailableStatus('Local Agent control requires a Node runtime with process.getBuiltinModule.'), {
      status: 500,
    })
  }

  const repoRoot = agentRepoRoot()
  const python =
    process.env.METEORTEST_AGENT_PYTHON ||
    `${repoRoot}/agent/${'.venv'}/bin/python`
  const child = childProcess.spawn(
    python,
    ['-m', 'agent.agent', '--config', 'agent/config.yaml', '--interval', process.env.METEORTEST_AGENT_INTERVAL || '10'],
    {
      cwd: repoRoot,
      detached: true,
      env: process.env,
      stdio: 'ignore',
    },
  )

  agentState().pid = child.pid ?? null
  child.unref()

  return NextResponse.json({
    running: true,
    started: true,
    pid: child.pid,
    logFile: '',
    logTail: '',
  })
}
