-- Add project-level notification fields
alter table projects
  add column if not exists webhook_url text not null default '',
  add column if not exists notify_on_failure boolean not null default true,
  add column if not exists notify_on_recovery boolean not null default false;
