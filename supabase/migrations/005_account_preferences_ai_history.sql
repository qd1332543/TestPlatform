-- Account-scoped preferences and AI conversation history.

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform_name text not null default '星流测试台',
  locale text not null default 'zh-CN' check (locale in ('zh-CN', 'en')),
  theme text not null default 'meteor' check (theme in ('meteor', 'indigo', 'dune', 'aurora', 'parchment', 'sky', 'glacier', 'sakura')),
  density text not null default 'comfortable' check (density in ('comfortable', 'compact')),
  default_environment text not null default 'dev' check (default_environment in ('dev', 'staging', 'prod')),
  ai_model text not null default 'deepseek-v4-pro',
  ai_base_url text not null default 'https://api.deepseek.com',
  auto_analyze_failures boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_preferences add column if not exists platform_name text not null default '星流测试台';

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  suggestions jsonb,
  actions jsonb,
  created_at timestamptz default now()
);

create index if not exists ai_conversations_user_updated_idx
  on ai_conversations(user_id, updated_at desc);

create index if not exists ai_messages_conversation_created_idx
  on ai_messages(conversation_id, created_at asc);

alter table user_preferences enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

drop policy if exists "user_preferences_select_own" on user_preferences;
create policy "user_preferences_select_own"
  on user_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_preferences_insert_own" on user_preferences;
create policy "user_preferences_insert_own"
  on user_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_preferences_update_own" on user_preferences;
create policy "user_preferences_update_own"
  on user_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "ai_conversations_select_own" on ai_conversations;
create policy "ai_conversations_select_own"
  on ai_conversations for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "ai_conversations_insert_own" on ai_conversations;
create policy "ai_conversations_insert_own"
  on ai_conversations for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "ai_conversations_update_own" on ai_conversations;
create policy "ai_conversations_update_own"
  on ai_conversations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "ai_conversations_delete_own" on ai_conversations;
create policy "ai_conversations_delete_own"
  on ai_conversations for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "ai_messages_select_own" on ai_messages;
create policy "ai_messages_select_own"
  on ai_messages for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "ai_messages_insert_own" on ai_messages;
create policy "ai_messages_insert_own"
  on ai_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from ai_conversations
      where ai_conversations.id = ai_messages.conversation_id
        and ai_conversations.user_id = auth.uid()
    )
  );

drop policy if exists "ai_messages_delete_own" on ai_messages;
create policy "ai_messages_delete_own"
  on ai_messages for delete
  to authenticated
  using (user_id = auth.uid());
