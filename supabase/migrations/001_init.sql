-- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  repo_url text not null,
  description text,
  created_at timestamptz default now()
);

-- test_suites
create table test_suites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  suite_key text not null,
  name text not null,
  type text not null check (type in ('api', 'ui', 'performance')),
  command text not null,
  requires text[]
);

-- executors
create table executors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('local_mac', 'github_actions', 'cloud_farm')),
  status text not null default 'offline' check (status in ('online', 'offline', 'busy')),
  capabilities text[],
  last_heartbeat_at timestamptz
);

-- tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  suite_id uuid references test_suites(id),
  environment text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout')),
  executor_id uuid references executors(id),
  parameters jsonb,
  created_by text,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  log_url text,
  allure_url text,
  screenshots text[],
  summary text,
  created_at timestamptz default now()
);

-- ai_analyses
create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  failure_reason text,
  impact text,
  suggestion text,
  suspected_files text[],
  flaky_probability numeric,
  raw_response text
);
