-- Auth profiles and row-level security boundaries.
-- Roles:
-- - viewer: read platform data.
-- - operator: create execution tasks and app builds.
-- - admin: manage projects, suites, and project metadata.
-- Local Agent and server-side automation continue to use the service-role key,
-- which bypasses RLS by Supabase design.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  phone text,
  display_name text,
  avatar_url text,
  role text not null default 'viewer' check (role in ('viewer', 'operator', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists username text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url text;

create unique index if not exists profiles_username_unique on profiles(username) where username is not null;
create unique index if not exists profiles_phone_unique on profiles(phone) where phone is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format_check'
  ) then
    alter table profiles
      add constraint profiles_username_format_check
      check (username is null or username ~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$')
      not valid;
  end if;
end $$;

create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null default 'general' check (category in ('general', 'bug', 'feature', 'account')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz default now()
);

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'viewer'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, phone, display_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.phone,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'viewer'
  )
  on conflict (id) do update
    set email = excluded.email,
        username = coalesce(public.profiles.username, excluded.username),
        phone = coalesce(public.profiles.phone, excluded.phone),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table projects enable row level security;
alter table test_suites enable row level security;
alter table executors enable row level security;
alter table tasks enable row level security;
alter table reports enable row level security;
alter table ai_analyses enable row level security;
alter table app_builds enable row level security;
alter table feedbacks enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
  on profiles for select
  to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin"
  on profiles for update
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "profiles_update_own_basic" on profiles;
create policy "profiles_update_own_basic"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_app_role());

drop policy if exists "projects_select_authenticated" on projects;
create policy "projects_select_authenticated"
  on projects for select
  to authenticated
  using (true);

drop policy if exists "projects_insert_admin" on projects;
create policy "projects_insert_admin"
  on projects for insert
  to authenticated
  with check (public.current_app_role() = 'admin');

drop policy if exists "projects_update_admin" on projects;
create policy "projects_update_admin"
  on projects for update
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "projects_delete_admin" on projects;
create policy "projects_delete_admin"
  on projects for delete
  to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "test_suites_select_authenticated" on test_suites;
create policy "test_suites_select_authenticated"
  on test_suites for select
  to authenticated
  using (true);

drop policy if exists "test_suites_write_admin" on test_suites;
create policy "test_suites_write_admin"
  on test_suites for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "executors_select_authenticated" on executors;
create policy "executors_select_authenticated"
  on executors for select
  to authenticated
  using (true);

drop policy if exists "tasks_select_authenticated" on tasks;
create policy "tasks_select_authenticated"
  on tasks for select
  to authenticated
  using (true);

drop policy if exists "tasks_insert_operator" on tasks;
create policy "tasks_insert_operator"
  on tasks for insert
  to authenticated
  with check (public.current_app_role() in ('operator', 'admin'));

drop policy if exists "tasks_update_operator" on tasks;
create policy "tasks_update_operator"
  on tasks for update
  to authenticated
  using (public.current_app_role() in ('operator', 'admin'))
  with check (public.current_app_role() in ('operator', 'admin'));

drop policy if exists "reports_select_authenticated" on reports;
create policy "reports_select_authenticated"
  on reports for select
  to authenticated
  using (true);

drop policy if exists "ai_analyses_select_authenticated" on ai_analyses;
create policy "ai_analyses_select_authenticated"
  on ai_analyses for select
  to authenticated
  using (true);

drop policy if exists "app_builds_select_authenticated" on app_builds;
create policy "app_builds_select_authenticated"
  on app_builds for select
  to authenticated
  using (true);

drop policy if exists "app_builds_insert_operator" on app_builds;
create policy "app_builds_insert_operator"
  on app_builds for insert
  to authenticated
  with check (public.current_app_role() in ('operator', 'admin'));

drop policy if exists "app_builds_update_admin" on app_builds;
create policy "app_builds_update_admin"
  on app_builds for update
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "app_builds_delete_admin" on app_builds;
create policy "app_builds_delete_admin"
  on app_builds for delete
  to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "feedbacks_insert_authenticated" on feedbacks;
create policy "feedbacks_insert_authenticated"
  on feedbacks for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feedbacks_select_own_or_admin" on feedbacks;
create policy "feedbacks_select_own_or_admin"
  on feedbacks for select
  to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "feedbacks_update_admin" on feedbacks;
create policy "feedbacks_update_admin"
  on feedbacks for update
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
