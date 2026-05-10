-- Safe demo dataset for MeteorTest public preview environments.
--
-- Run after:
--   supabase/migrations/001_init.sql
--   supabase/migrations/002_app_builds.sql
--   supabase/migrations/003_constraints.sql
--
-- This seed intentionally uses public-safe placeholder URLs and synthetic
-- execution data. Do not replace these values with real device records,
-- private app builds, internal URLs, test accounts, local paths, or secrets.

begin;

insert into projects (key, name, repo_url, description)
values (
  'ios-automation-framework',
  'iOS-Automation-Framework',
  'https://github.com/JunchenMeteor/iOS-Automation-Framework',
  'Public-safe demo project for MeteorTest preview data. It mirrors the first test-project integration sample without exposing private devices or accounts.'
)
on conflict (key) do update set
  name = excluded.name,
  repo_url = excluded.repo_url,
  description = excluded.description;

with demo_project as (
  select id from projects where key = 'ios-automation-framework'
)
insert into test_suites (project_id, suite_key, name, type, command, requires)
select
  demo_project.id,
  'api_smoke',
  'API Smoke',
  'api',
  'python -m pytest API_Automation/cases -m smoke --alluredir=Reports/platform/preview-smoke/allure-results',
  array['python', 'pytest', 'local_mock_api']
from demo_project
on conflict (project_id, suite_key) do update set
  name = excluded.name,
  type = excluded.type,
  command = excluded.command,
  requires = excluded.requires;

with demo_project as (
  select id from projects where key = 'ios-automation-framework'
)
insert into app_builds (
  project_id,
  platform,
  version,
  build_number,
  artifact_url,
  bundle_id,
  package_name,
  git_commit
)
select
  demo_project.id,
  'ios',
  'preview-1.0.0',
  '100',
  'https://example.com/meteortest-preview/demo-app-build.ipa',
  'com.jcmeteor.preview',
  null,
  'preview-demo'
from demo_project
where not exists (
  select 1
  from app_builds
  where project_id = demo_project.id
    and platform = 'ios'
    and version = 'preview-1.0.0'
    and build_number = '100'
);

insert into executors (name, type, status, capabilities, last_heartbeat_at)
values (
  'local-agent-demo',
  'local_mac',
  'offline',
  array['api', 'pytest', 'preview-only'],
  now() - interval '2 hours'
)
on conflict (name) do update set
  type = excluded.type,
  status = excluded.status,
  capabilities = excluded.capabilities,
  last_heartbeat_at = excluded.last_heartbeat_at;

with refs as (
  select
    projects.id as project_id,
    test_suites.id as suite_id,
    executors.id as executor_id,
    (
      select app_builds.id
      from app_builds
      where app_builds.project_id = projects.id
        and app_builds.platform = 'ios'
        and app_builds.version = 'preview-1.0.0'
        and app_builds.build_number = '100'
      order by app_builds.created_at desc
      limit 1
    ) as app_build_id
  from projects
  join test_suites on test_suites.project_id = projects.id
  join executors on executors.name = 'local-agent-demo'
  where projects.key = 'ios-automation-framework'
    and test_suites.suite_key = 'api_smoke'
),
seed_tasks as (
  select *
  from refs
  cross join lateral (
    values
      (
        'preview-api-smoke-queued',
        'queued',
        null::timestamptz,
        null::timestamptz,
        null::uuid,
        jsonb_build_object(
          'preview_task_key', 'preview-api-smoke-queued',
          'display_name', 'Preview queued API smoke',
          'source', 'seed-preview',
          'safe_demo', true,
          'notes', 'Queued demo task for public preview surfaces.'
        )
      ),
      (
        'preview-api-smoke-succeeded',
        'succeeded',
        now() - interval '90 minutes',
        now() - interval '86 minutes',
        null::uuid,
        jsonb_build_object(
          'preview_task_key', 'preview-api-smoke-succeeded',
          'display_name', 'Preview succeeded API smoke',
          'source', 'seed-preview',
          'safe_demo', true,
          'pytest', jsonb_build_object('passed', 6, 'deselected', 16, 'exit_code', 0)
        )
      ),
      (
        'preview-api-smoke-failed',
        'failed',
        now() - interval '45 minutes',
        now() - interval '41 minutes',
        executor_id,
        jsonb_build_object(
          'preview_task_key', 'preview-api-smoke-failed',
          'display_name', 'Preview failed API smoke',
          'source', 'seed-preview',
          'safe_demo', true,
          'failure_category', 'environment',
          'pytest', jsonb_build_object('passed', 5, 'failed', 1, 'deselected', 16, 'exit_code', 1)
        )
      )
  ) as task_values(task_key, status, started_at, finished_at, executor_for_task, parameters)
),
inserted_tasks as (
  insert into tasks (
    project_id,
    suite_id,
    app_build_id,
    environment,
    status,
    executor_id,
    parameters,
    created_by,
    created_at,
    started_at,
    finished_at
  )
  select
    project_id,
    suite_id,
    app_build_id,
    'preview',
    status,
    executor_for_task,
    parameters,
    'preview-seed',
    now() - interval '2 hours',
    started_at,
    finished_at
  from seed_tasks
  where not exists (
    select 1
    from tasks existing
    where existing.parameters ->> 'preview_task_key' = seed_tasks.task_key
  )
  returning id, parameters
)
insert into reports (task_id, log_url, allure_url, screenshots, summary)
select
  inserted_tasks.id,
  case inserted_tasks.parameters ->> 'preview_task_key'
    when 'preview-api-smoke-succeeded' then 'https://example.com/meteortest-preview/logs/api-smoke-succeeded.log'
    when 'preview-api-smoke-failed' then 'https://example.com/meteortest-preview/logs/api-smoke-failed.log'
    else null
  end,
  case inserted_tasks.parameters ->> 'preview_task_key'
    when 'preview-api-smoke-succeeded' then 'https://example.com/meteortest-preview/allure/api-smoke-succeeded/'
    when 'preview-api-smoke-failed' then 'https://example.com/meteortest-preview/allure/api-smoke-failed/'
    else null
  end,
  array[]::text[],
  case inserted_tasks.parameters ->> 'preview_task_key'
    when 'preview-api-smoke-succeeded' then 'Preview API smoke completed successfully: 6 passed, 16 deselected, exit code 0.'
    when 'preview-api-smoke-failed' then 'Preview API smoke failed in a synthetic environment-check case: 5 passed, 1 failed, 16 deselected, exit code 1.'
    else 'Preview queued task has not produced a report yet.'
  end
from inserted_tasks
where inserted_tasks.parameters ->> 'preview_task_key' in (
  'preview-api-smoke-succeeded',
  'preview-api-smoke-failed'
);

with failed_task as (
  select id
  from tasks
  where parameters ->> 'preview_task_key' = 'preview-api-smoke-failed'
  limit 1
)
insert into ai_analyses (
  task_id,
  failure_reason,
  impact,
  suggestion,
  suspected_files,
  flaky_probability,
  raw_response
)
select
  failed_task.id,
  'Synthetic preview failure: the mock API health check returned an unexpected status.',
  'Preview-only impact. This row demonstrates how MeteorTest presents failed-task context without exposing real environments.',
  'Check API_BASE_URL, mock API startup state, and environment selection before rerunning the smoke suite.',
  array['API_Automation/cases/test_health.py', 'tools/mock_api/server.py'],
  0.18,
  'Preview seed analysis. No real logs, credentials, devices, or private endpoints are included.'
from failed_task
where not exists (
  select 1
  from ai_analyses existing
  where existing.task_id = failed_task.id
);

commit;
