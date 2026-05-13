# Internal ID Exposure Hardening Plan

Updated: 2026-05-13

## Background

MeteorTest currently uses Supabase/Postgres UUIDs as primary and foreign keys:

- `profiles.id`
- `projects.id`
- `test_suites.id`
- `tasks.id`
- `executors.id`
- `reports.id`
- `ai_analyses.id`
- `app_builds.id`
- `user_preferences.user_id`
- `ai_conversations.id`
- `ai_messages.id`

These IDs are internal relational identifiers. They are appropriate for database constraints, RLS, server-side queries, and Agent writeback, but they should not be default UI display data.

## Goals

- Do not show full UUIDs by default in the frontend.
- Do not treat internal user, project, task, build, or executor IDs as business-facing information.
- Prefer human-readable display IDs for routes, forms, AI context, and exports.
- Return DTOs / View Models to the browser instead of raw database rows.
- Keep Supabase RLS for access control and use DTOs for exposure control.

## Non-Goals

- Do not remove UUID primary keys from the database.
- Do not treat UUID hiding as authorization. Auth, RLS, and server role checks remain the security boundary.
- Do not remove debuggability. Admin-only collapsed debug views can expose internal IDs when needed, but never by default.

## ID Classes

### Internal IDs

Server, database, and Agent only. Do not display, export, or send to AI by default.

Examples:

- `profiles.id`
- `auth.users.id`
- `tasks.project_id`
- `tasks.suite_id`
- `tasks.executor_id`
- `reports.task_id`
- `ai_analyses.task_id`
- `app_builds.project_id`
- `user_preferences.user_id`
- `ai_messages.user_id`

### Operation References

When the browser needs detail routes, edits, deletes, or task creation, use stable public references instead of internal UUIDs.

Recommended references:

- Project: `projects.key`, for example `yunlu-ios`.
- Suite: `project_key + suite_key`.
- Task: add `tasks.display_id`, for example `MT-20260513-0001`.
- Build: add `app_builds.display_id`, or use `project_key + platform + version + build_number`.
- Executor: `executors.name`, for example `local-mac-01`.
- User: `profiles.username` or `display_name`, not `auth.users.id`.

### Display IDs

Use for pages, exports, AI, copy, and search.

| Entity | Current internal ID | Recommended display ID |
| --- | --- | --- |
| User | `auth.users.id` | `username` / `display_name` |
| Project | `projects.id` | `projects.key` |
| Suite | `test_suites.id` | `suite_key` |
| Task | `tasks.id` | `tasks.display_id` |
| Build | `app_builds.id` | `app_builds.display_id` |
| Executor | `executors.id` | `executors.name` |
| Report | `reports.id` | `task.display_id + report.created_at` |
| AI conversation | `ai_conversations.id` | `title + updated_at` |

## Display Reference Dictionary

A generic display reference dictionary can let the frontend use public refs while the server resolves them to internal UUIDs.

Recommended table:

```sql
create table entity_display_refs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  display_id text not null,
  label text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (entity_type, display_id),
  unique (entity_type, entity_id)
);
```

Example rows:

```text
entity_type = task
entity_id = 9a2d691c-...
display_id = MT-20260513-0001
label = Yunlu iOS / api_smoke / dev
metadata = { "status": "succeeded", "environment": "dev" }
```

```text
entity_type = project
entity_id = 2d7d...
display_id = yunlu-ios
label = Yunlu iOS
metadata = { "repoLinked": true }
```

Frontend usage:

- Lists show `display_id` and `label`.
- Select option values use `display_id` or business keys.
- APIs accept `display_id`; the server resolves it to `entity_id`.
- AI tools prefer `display_id`, `project_key`, and `suite_key`.

Notes:

- `projects.key` can remain the public project reference.
- `test_suites.suite_key` should be combined with `project_key`.
- `executors.name` can remain the public executor reference.
- `tasks` and `app_builds` should get `display_id`.

## API DTO Rules

Do not return raw database rows to the browser.

Avoid:

```ts
select('*')
return NextResponse.json(data)
```

Prefer:

```ts
return {
  task: {
    ref: task.display_id,
    status: task.status,
    environment: task.environment,
    project: { key: project.key, name: project.name },
    suite: { key: suite.suite_key, name: suite.name },
    executor: executor ? { name: executor.name } : null,
    createdAt: task.created_at,
  }
}
```

Naming:

- `ref`: browser operation reference, such as `MT-20260513-0001`.
- `label`: user-facing name.
- `internalId`: disallowed in browser DTOs by default.
- `debug.internalId`: admin-only, opt-in debug view only.

## Current Hardening Targets

### Profile

Current risk:

- Profile page displays `user.id`.

Target:

- Hide `user.id` by default.
- Show `username`, `display_name`, `role`, `phone`, and `email`.
- Add an admin-only collapsed debug section later if needed.

### Tasks / Task Detail

Current risk:

- Task list, task detail, report exports, and AI cards use `tasks.id`.
- `/tasks/[id]` uses internal UUIDs.

Target:

- Add `tasks.display_id`.
- Show `display_id`, not full UUID.
- Migrate route to `/tasks/[ref]`; server resolves `display_id` to internal UUID.
- Export files use `display_id`.
- AI packages use `display_id`.

### Projects / Project Detail

Current risk:

- `/projects/[id]` uses internal UUIDs.
- Project detail passes `project.id` to management and import forms.

Target:

- Migrate route to `/projects/[key]`.
- Use `project.key` for frontend display and operations.
- Server API resolves `key` to internal ID.

### New Task / New Build Forms

Current risk:

- Select option values use `project.id`, `suite.id`, and `app_builds.id`.

Target:

- Project option value uses `project.key`.
- Suite option value uses `suite_key`.
- Build option value uses `build.display_id`.
- API accepts public refs and resolves internal IDs server-side.

### Reports

Current risk:

- Reports use task UUIDs for detail links and export filenames.

Target:

- Use `task.display_id`.
- Do not show `reports.id`.
- Keep log and Allure links.

### AI Center

Current risk:

- AI context, tool parameters, and suggestions use task UUIDs.
- `taskIdPattern` detects UUIDs and turns them into task links.

Target:

- AI context uses `task.display_id`.
- Tool parameters support `task_ref`; server resolves it.
- Keep `task_id` only for backward compatibility.
- Link detection should recognize display IDs such as `MT-YYYYMMDD-NNNN`.

### Builds

Current risk:

- Build page queries and task association use `app_builds.id`.

Target:

- Add `app_builds.display_id`.
- Pages and forms use `display_id`.
- Server resolves it before writing `tasks.app_build_id`.

### Executors

Current risk:

- Executor page queries `executors.id`, mostly as React keys.

Target:

- Display and reference `executors.name`.
- Do not show `executors.id`.
- React keys can use `name`.

## Migration Design

### Option A: Add `display_id` to Core Tables

Good for core business entities:

- `tasks.display_id`
- `app_builds.display_id`

Pros:

- Simple queries.
- Clear routes.
- Stable exports and AI references.

Cons:

- Each entity needs a generation rule.

### Option B: Generic `entity_display_refs`

Good for unified display reference management.

Pros:

- Unified DTO mapping.
- Can store labels and metadata.
- Enables aliases, search, and localized labels later.

Cons:

- More query and synchronization complexity.
- Must keep source table and dictionary rows consistent.

### Final Implementation Combination

This hardening does not use a temporary hide-only stage. It should land directly as an API DTO / View Model boundary:

- `projects.key`: public project reference.
- `test_suites.suite_key`: combined with `project_key`.
- `executors.name`: public executor reference.
- `tasks.display_id`: add column.
- `app_builds.display_id`: add column.
- `entity_display_refs`: reserved as a future generic dictionary capability; it does not block the current DTO boundary.

## Current Implementation Status

- `supabase/migrations/008_display_refs.sql` adds and backfills `tasks.display_id` and `app_builds.display_id`, then provides the `next_display_id` generator.
- `apps/web/lib/viewModels/displayRefs.ts` centralizes task and build display references.
- `/api/tasks` accepts `project_key`, `suite_key`, and `app_build_ref`, resolves internal IDs server-side, and returns only `task_ref`.
- `/api/builds` accepts `project_key`, resolves the internal project ID server-side, and returns only `build_ref`.
- Project detail and project management APIs use `projects.key` as the browser-facing operation reference.
- New task and new build forms no longer expose `project_id`, `suite_id`, or `app_build_id` as option values.
- AI Center uses display IDs in platform snapshots, tool descriptions, suggestion prompts, and task cards; user-visible copy comes from `apps/web/content/i18n.ts`.
- Task / Report / Build / Dashboard pages prefer display IDs for display and routes.

## Acceptance Criteria

- Standard pages do not show full UUIDs.
- Profile does not show `auth.users.id` by default.
- Task / Report / AI pages use `tasks.display_id`.
- Project routes use `projects.key`.
- New task form does not expose `project_id`, `suite_id`, or `app_build_id` as option values.
- AI prompts, suggestions, and analysis packages do not include internal UUIDs by default.
- Server-side code still uses internal UUIDs for database relationships.
- RLS, role checks, and Agent writeback continue to work.

## Security Boundary

Hiding UUIDs is not authorization. The true security boundary remains:

- Supabase Auth
- RLS policies
- API role checks
- service-role keys restricted to server and private Agent runtimes

The value of hiding UUIDs is:

- Reduce exposure of internal data structure.
- Prevent users, AI, and exports from receiving internal relational IDs.
- Make the product UI more professional.
- Prepare for future multi-tenant access, project-level permissions, and audit workflows.
