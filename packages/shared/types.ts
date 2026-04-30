export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timeout'
export type ExecutorType = 'local_mac' | 'github_actions' | 'cloud_farm'
export type ExecutorStatus = 'online' | 'offline' | 'busy'
export type SuiteType = 'api' | 'ui' | 'performance'

export interface Project {
  id: string
  key: string
  name: string
  repo_url: string
  description: string | null
  created_at: string
}

export interface TestSuite {
  id: string
  project_id: string
  suite_key: string
  name: string
  type: SuiteType
  command: string
  requires: string[] | null
}

export interface Executor {
  id: string
  name: string
  type: ExecutorType
  status: ExecutorStatus
  capabilities: string[] | null
  last_heartbeat_at: string | null
}

export interface AppBuild {
  id: string
  project_id: string
  platform: 'ios' | 'android' | 'web'
  version: string
  build_number: string | null
  artifact_url: string
  bundle_id: string | null
  package_name: string | null
  git_commit: string | null
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  suite_id: string
  app_build_id: string | null
  environment: string
  status: TaskStatus
  executor_id: string | null
  parameters: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface Report {
  id: string
  task_id: string
  log_url: string | null
  allure_url: string | null
  screenshots: string[] | null
  summary: string | null
  created_at: string
}

export interface AiAnalysis {
  id: string
  task_id: string
  failure_reason: string | null
  impact: string | null
  suggestion: string | null
  suspected_files: string[] | null
  flaky_probability: number | null
  raw_response: string | null
}
