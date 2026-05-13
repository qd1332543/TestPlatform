create table if not exists agent_runtime_settings (
  id                          uuid primary key default gen_random_uuid(),
  executor_name               text not null default 'default',
  enabled                     boolean not null default true,
  task_check_interval_seconds integer not null default 300,
  task_source                 text not null default 'supabase',
  private_preview_only        boolean not null default false,
  updated_by                  text,
  updated_at                  timestamptz not null default now(),
  -- display fields
  display_name                text,
  description                 text,
  display_order               integer not null default 0
);

insert into agent_runtime_settings (executor_name, task_check_interval_seconds)
values ('default', 300)
on conflict do nothing;
