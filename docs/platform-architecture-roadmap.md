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

1. Apply `supabase/migrations/004_auth_rls.sql`.
2. Create the admin user in Supabase Auth. Username accounts can use an internal email alias such as `admin@users.meteortest.local`; phone accounts should use international phone format such as `+86...`.
3. Promote the user to `admin` in `profiles`.
4. Deploy Web and verify `/login`, `/profile`, task creation, project management, and build registration.
5. Run the private Agent and validate with `npm run validate:private-agent-loop`.
6. Continue with organization/project-level permissions, feedback admin workflow, task cancel/rerun, and richer Allure visualization.
