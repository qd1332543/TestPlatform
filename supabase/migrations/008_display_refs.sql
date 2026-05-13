-- Public display references for user-facing entities.
-- UUID primary keys remain internal database identifiers.

alter table tasks add column if not exists display_id text;
alter table app_builds add column if not exists display_id text;

with ordered_tasks as (
  select
    id,
    created_at,
    row_number() over (partition by date(created_at) order by created_at, id) as seq
  from tasks
  where display_id is null
)
update tasks
set display_id = 'MT-' || to_char(ordered_tasks.created_at, 'YYYYMMDD') || '-' || lpad(ordered_tasks.seq::text, 4, '0')
from ordered_tasks
where tasks.id = ordered_tasks.id;

with ordered_builds as (
  select
    id,
    created_at,
    row_number() over (partition by date(created_at) order by created_at, id) as seq
  from app_builds
  where display_id is null
)
update app_builds
set display_id = 'BLD-' || to_char(ordered_builds.created_at, 'YYYYMMDD') || '-' || lpad(ordered_builds.seq::text, 4, '0')
from ordered_builds
where app_builds.id = ordered_builds.id;

create unique index if not exists tasks_display_id_unique on tasks(display_id) where display_id is not null;
create unique index if not exists app_builds_display_id_unique on app_builds(display_id) where display_id is not null;

create or replace function public.next_display_id(prefix text, table_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYYMMDD');
  current_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('display-id:' || table_name || ':' || prefix || ':' || today));

  if table_name = 'tasks' then
    select count(*) + 1 into current_count
    from public.tasks
    where display_id like prefix || '-' || today || '-%';
  elsif table_name = 'app_builds' then
    select count(*) + 1 into current_count
    from public.app_builds
    where display_id like prefix || '-' || today || '-%';
  else
    raise exception 'Unsupported display id table: %', table_name;
  end if;

  return prefix || '-' || today || '-' || lpad(current_count::text, 4, '0');
end;
$$;
