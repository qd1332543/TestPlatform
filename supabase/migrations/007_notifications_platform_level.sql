-- Move notification settings from projects to user_preferences (platform-level)
alter table user_preferences
  add column if not exists webhook_url text not null default '',
  add column if not exists notify_on_failure boolean not null default true,
  add column if not exists notify_on_recovery boolean not null default false;

-- Remove notification columns from projects
alter table projects
  drop column if exists webhook_url,
  drop column if exists notify_on_failure,
  drop column if exists notify_on_recovery;
