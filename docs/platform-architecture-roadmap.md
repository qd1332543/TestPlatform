# MeteorTest Platform Architecture And Roadmap

Updated: 2026-05-12

MeteorTest is now an early Beta automation testing platform. It combines a Web Console, Next.js Server Routes, Supabase, a private Local Agent, and per-project test contracts.

The current public preview is `https://meteortest.jcmeteor.com/`. The public Web deployment is an operations console only; real execution stays private through the Local Agent polling Supabase.

## Current Capabilities

- Project and suite management, including `meteortest.yml` import.
- Task creation from Web and AI surfaces.
- Private Agent polling, execution, status update, and report writeback.
- Build artifact registration and task association.
- Report summaries, log links, AI failure analysis, and repair handoff exports.
- Verified private Agent preview loop.

## Current Hardening Scope

1. Auth, RLS, and role boundaries.
2. Complete Allure report URL writeback.
3. One-command or semi-automated private Agent preview validation.
4. Agent configuration validation and clear startup errors.

## Access Model

- `viewer`: read projects, suites, tasks, reports, executors, and AI analysis.
- `operator`: viewer plus task creation and build registration.
- `admin`: operator plus project management, suite import, and platform-critical changes.

Pages require Supabase Auth. Write APIs check roles before using server-only service-role access. Supabase RLS blocks anonymous access and enforces authenticated role policies. The Local Agent keeps using a private service-role key and is never exposed directly to public Web traffic.

## Architecture Boundary

MeteorTest is currently a modular Next.js application, not a fully split frontend/backend deployment:

- `apps/web/app/**`: pages and UI workflows.
- `apps/web/app/api/**`: server-side platform API surface.
- `apps/web/lib/**`: shared Web infrastructure.
- `agent/**`: independent Python Local Agent.
- `supabase/migrations/**`: schema, constraints, and RLS policies.

This is intentional for the current phase. A dedicated backend service can be extracted later if team size, runtime isolation, or API ownership requires it.

## Implemented In This Stage

- Supabase `profiles`, `feedbacks`, and RLS policies.
- Login with username/password or phone/password, profile, logout, profile editing, feedback submission.
- Role checks for task creation, project management, suite import, and AI write tools.
- Allure path detection for explicit `--alluredir` commands.
- `npm run validate:private-agent-loop`.
- Local Agent config validation before polling.

## Login Account Strategy

The login page accepts either username/password or phone/password:

- Phone accounts use Supabase Auth `phone + password` directly.
- Username accounts are shown as `username` in the product and stored in `profiles.username`; Supabase Auth uses an internal email alias such as `admin@users.meteortest.local`.
- The internal email alias is not a real user email and is not used for mail delivery. It only lets the platform reuse Supabase Auth password, session, and RLS behavior.
- `display_name` is for flexible presentation. Login usernames should stay stable, 3-20 characters long, and use letters, numbers, underscores, and hyphens.

## Recommended Next Steps

1. Follow the [Supabase account and account-scoped data SQL runbook](supabase-account-data-runbook.md), then apply the latest `004_auth_rls.sql` and `005_account_preferences_ai_history.sql`.
2. Create the admin user in Supabase Auth. Username accounts can use an internal email alias such as `admin@users.meteortest.local`; phone accounts should use international phone format such as `+86...`.
3. Promote the user to `admin` in `profiles`.
4. Deploy Web and verify `/login`, `/profile`, `/settings`, `/ai`, task creation, project management, and build registration.
5. Run the private Agent and validate with `npm run validate:private-agent-loop`.
6. Continue with organization/project-level permissions, feedback admin workflow, task cancel/rerun, and richer Allure visualization.

## Agent Resource Saving And Platform Management Plan

Goal: treat the local Agent as a private server, reduce resource usage when task volume is low, and keep task results fully written back to Supabase.

First feature: platform-configurable task check frequency.

- Add “Task check frequency” to Settings.
- Use a segmented slider, not free numeric input.
- Support these segments: `30s`, `1m`, `5m`, `10m`, `15m`, `30min`, `45min`, `60min`.
- Recommended default: `5m`.
- Shorter segments start tasks faster; longer segments reduce local and Supabase requests.
- This setting only affects new-task check frequency. It does not affect Agent online heartbeat.
- Recommended fixed Agent heartbeat: `120s`, so the Web console can reliably determine executor online state.
- Save config to Supabase as platform-level Agent runtime configuration, editable by `admin` only.
- Keep the Agent resident in the background. While idle, it checks for new tasks according to the configured interval. Results still write back to `tasks`, `reports`, and failed-task `ai_analyses`.
- Local `launchd` is only the process supervisor. Platform config controls runtime strategy. Web surfaces show status and results.

Details: [Local Agent operations](local-agent-operations.md).

## Account-Scoped Data Plan

Tracking issue: `#82 [Feature] Add account-scoped preferences and AI conversation history`

### Step 1: Account Preferences

Status: implemented, pending live Supabase verification after `005_account_preferences_ai_history.sql` is applied.

Goal: move the key user preferences currently stored in `meteortest.settings.v1` localStorage to account-scoped Supabase data.

Table: `user_preferences`

Fields:

- `user_id`
- `locale`
- `theme`
- `density`
- `default_environment`
- `ai_model`
- `ai_base_url`
- `auto_analyze_failures`

Rules:

- Read preferences after sign-in.
- Save preferences from Settings to Supabase and mirror them to local storage.
- Keep local storage as a fallback for signed-out, pre-load, or network-failure states.
- Keep the locale cookie for Next.js first paint and server dictionary selection; sync it when account preferences are saved.

Acceptance:

- Settings loads theme, locale, density, default environment, and AI config from account preferences.
- Preferences survive refresh after saving.
- `npm run lint`, `npm run build`, and `npm run smoke:public-preview` pass.

### Step 2: AI Conversation History

Status: account API and Web integration implemented, pending live Supabase verification after `005_account_preferences_ai_history.sql` is applied.

Goal: move AI chat history from browser localStorage to account-scoped conversations.

Tables:

- `ai_conversations`
- `ai_messages`

Rules:

- Persist conversation creation, user messages, and assistant replies.
- Show account history in the AI page sidebar.
- Support delete, rename, and continue conversation.
- Use localStorage only as a temporary fallback for unauthenticated or failed-load states.

Acceptance:

- AI history remains after page refresh.
- Delete, rename, and continue actions sync to Supabase.
- Failed AI sends do not corrupt existing history.
- `npm run lint`, `npm run build`, and `npm run smoke:public-preview` pass.
