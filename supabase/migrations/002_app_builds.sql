-- app_builds
create table app_builds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  version text not null,
  build_number text,
  artifact_url text not null,
  bundle_id text,
  package_name text,
  git_commit text,
  created_at timestamptz default now()
);

-- tasks: add app_build_id
alter table tasks add column app_build_id uuid references app_builds(id);
