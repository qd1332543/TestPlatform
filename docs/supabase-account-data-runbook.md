# Supabase Account And Account-Scoped Data SQL Runbook

Updated: 2026-05-13

Scope: MeteorTest preview / production Supabase projects.

## Execution Rules

- Do not rerun legacy `001` / `002` / `003` initialization SQL unless you intentionally rebuild base platform tables or demo data.
- If an older `004_auth_rls.sql` was already executed, rerun the latest `004_auth_rls.sql`. It uses `create table if not exists`, `add column if not exists`, and `drop policy if exists` to safely complete Auth/RLS boundaries.
- Run `005_account_preferences_ai_history.sql` for account-scoped preferences and AI history.
- Run `008_display_refs.sql` for public task and build display IDs used by the internal-ID hardening work.
- When Supabase SQL Editor warns about RLS or destructive operations, verify the SQL file matches this runbook before executing it.

## Recommended Order

1. Open Supabase Dashboard.
2. Open the target project.
3. Open `SQL Editor`.
4. Execute the latest `supabase/migrations/004_auth_rls.sql`.
5. Execute `supabase/migrations/005_account_preferences_ai_history.sql`.
6. Execute `supabase/migrations/008_display_refs.sql`.
7. Create the admin account in `Authentication > Users`.
8. Open `Table Editor > profiles` and set that user's `role` to `admin`.
9. Sign in to `https://meteortest.jcmeteor.com/` and verify access.

## What 004_auth_rls.sql Does

- Creates or completes `profiles`.
- Creates or completes `feedbacks`.
- Enables RLS for core platform tables.
- Adds viewer / operator / admin read and write policies.
- Supports login, profile, feedback, and role-checked API writes.

Rerunning the latest 004 after an older version completes missing columns, functions, and policies. It does not clear data.

## What 005_account_preferences_ai_history.sql Does

- `user_preferences`: locale, theme, density, default environment, AI model, AI base URL, and auto failure analysis.
- `ai_conversations`: current user's AI conversations.
- `ai_messages`: user messages, assistant replies, suggestions, and tool results.

All tables enable RLS. Users can only access their own preferences, conversations, and messages.

## What 008_display_refs.sql Does

- Adds `tasks.display_id`, such as `MT-20260513-0001`.
- Adds `app_builds.display_id`, such as `BLD-20260513-0001`.
- Backfills display IDs for existing tasks and builds.
- Creates unique indexes so display IDs cannot collide.
- Creates `public.next_display_id(prefix, table_name)` for server-side task and build creation.

This migration does not delete business tables or clear data. If Supabase warns about destructive operations, verify that the SQL content matches this repository before executing it.

## Admin Account Notes

Username login:

- Use an internal Supabase Auth email alias such as `admin@users.meteortest.local`.
- This is not a real mailbox. It only reuses Supabase Auth password, session, and RLS behavior.
- Store the actual login username, such as `admin`, in `profiles.username`.

Phone login:

- Use international format such as `+8613800000000`.
- The current scope supports phone + password; SMS code login is not part of this stage.

## Verification

Run:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'feedbacks', 'user_preferences', 'ai_conversations', 'ai_messages')
order by tablename;
```

Expected:

- All five tables are present.
- `rowsecurity` is `true`.

Then run:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'feedbacks', 'user_preferences', 'ai_conversations', 'ai_messages')
order by tablename, policyname;
```

Web verification:

- `/login` signs in.
- `/profile` shows account, role, and feedback.
- `/settings` persists language, theme, density, default environment, and AI config after refresh.
- `/ai` supports create, send, refresh, rename, and delete for conversations.

## Common Warnings

`New tables will not have Row Level Security enabled`

- This is a generic Supabase warning for new tables.
- The project SQL enables RLS and creates policies later in the same migration, so it is expected if the full file is present.

`Query has destructive operations`

- This mainly comes from `drop policy if exists`.
- The migration drops old policies and recreates them; it does not drop business tables.
