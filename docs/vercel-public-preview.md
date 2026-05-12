# Vercel Public Preview Deployment

This runbook describes how to deploy MeteorTest Web to Vercel as a public preview. Follow it before adding any public MeteorTest Web URL to README files, the personal website, or project documentation.

## Deployment Goal

Deploy the Web console only:

- Public visitors can open the MeteorTest Web UI.
- Current preview URL: `https://meteortest.jcmeteor.com/`.
- The deployment uses an isolated preview Supabase project or schema.
- Secrets live in Vercel Project Settings, not in Git.
- Local Agent execution stays private.
- Public connected execution remains out of scope until authentication, data isolation, rate limits, and executor safety are designed.

## What The User Must Provide Manually

The project owner must do these steps because they involve account ownership, browser login, or secrets:

1. Log in to Vercel with the intended GitHub account.
2. Authorize Vercel to access `JunchenMeteor/MeteorTest`.
3. Create or select a preview Supabase project.
4. Run the Supabase migrations against that preview project.
5. Copy the real Supabase URL, anon key, and service-role key from Supabase.
6. Decide whether `DEEPSEEK_API_KEY` should be enabled for the preview.
7. Add environment variables in Vercel Project Settings.
8. Click Deploy or Redeploy in Vercel.
9. Share the public preview URL or deployment error logs for follow-up checks.

Do not paste real service-role keys, API keys, or private project URLs into chat, issues, PR bodies, README files, screenshots, or committed files.

## What Codex Can Help With

Codex can do these steps from the repository:

1. Verify the Web app builds locally with `npm run lint` and `npm run build`.
2. Review which environment variables the code reads.
3. Update README, AGENTS, PROGRESS, and runbooks.
4. Add safety checks or clearer unavailable states if the public preview exposes confusing controls.
5. Review Vercel build logs if the user provides the non-secret error output.
6. Debug public URL behavior after deployment.
7. Prepare PRs for fixes.

Codex should not configure production secrets or log in to the user's Vercel, Supabase, or AI provider accounts.

## Required Vercel Project Settings

Import settings:

```text
Git repository: JunchenMeteor/MeteorTest
Framework preset: Next.js
Root Directory: apps/web
Install Command: npm ci
Build Command: npm run build
Output Directory: default / leave empty
Node.js version: 22
```

Environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-preview-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-preview-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-preview-service-role-key
DEEPSEEK_API_KEY=optional
METEORTEST_AGENT_DISABLED=1
METEORTEST_PUBLIC_PREVIEW=1
METEORTEST_PREVIEW_ACCESS_TOKEN=optional-shared-preview-token
```

Use Vercel Project Settings for these values. Do not commit `.env.local`.

`METEORTEST_PREVIEW_ACCESS_TOKEN` enables the app-level preview gate. When it is set together with `METEORTEST_PUBLIC_PREVIEW=1`, visitors must enter the token before loading pages. API callers can pass the same value in the `x-meteortest-preview-token` header. Leave it empty only for short-lived previews that are already protected by Vercel Deployment Protection or another access control layer.

Do not configure `METEORTEST_SMOKE_NO_SUPABASE` in Vercel. That flag is only for CI smoke checks that must verify public-preview safety without requiring real Supabase credentials.

Important boundaries:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-visible.
- `SUPABASE_SERVICE_ROLE_KEY` and `DEEPSEEK_API_KEY` are server-only.
- Never add the `NEXT_PUBLIC_` prefix to service-role or AI provider keys.
- Do not configure `METEORTEST_REPO_ROOT`, `METEORTEST_AGENT_PYTHON`, `METEORTEST_AGENT_INTERVAL`, local repository paths, or local Agent config in the public deployment unless an execution-safety design exists.
- Public preview deployments must not attempt to spawn a Local Agent. `/executors` and `/api/agent/status` should show a disabled/unavailable state.
- If `METEORTEST_PREVIEW_ACCESS_TOKEN` is set, keep it server-only in Vercel Project Settings and do not paste it into issues, PR bodies, screenshots, or client code.

## Supabase Preview Setup

Use a dedicated preview project or a clearly isolated preview schema.

Run migrations in order:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_app_builds.sql
supabase/migrations/003_constraints.sql
```

For the first public preview, prefer empty data or demo data. Do not connect real device records, private app builds, internal URLs, real test accounts, or production report storage.

To seed public-safe demo data after migrations, run:

```text
supabase/seed-preview.sql
```

The seed creates a demo `iOS-Automation-Framework` project, `api_smoke` suite, placeholder build metadata, an offline `local-agent-demo` executor, queued/succeeded/failed tasks, report summaries, and a synthetic AI analysis row. It is intended for preview surfaces only and must not be edited to include private endpoints, local paths, credentials, real devices, or production artifacts.

## Vercel Dashboard Flow

1. Open Vercel.
2. Select the correct personal account or team.
3. Choose `Add New...` then `Project`.
4. Import `JunchenMeteor/MeteorTest`.
5. In project configuration, set `Root Directory` to `apps/web`.
6. Confirm the framework is `Next.js`.
7. Set the install command to `npm ci`.
8. Set the build command to `npm run build`.
9. Set Node.js version to `22` in Project Settings if the import page does not show it.
10. Open Environment Variables and add the required variables for Preview and Production as appropriate.
11. Deploy.

If an environment variable changes later, redeploy. Vercel environment variable changes do not modify already-created deployments.

## First Smoke Check After Deployment

Before or after a deployment change, the repository CI runs:

```bash
npm run smoke:public-preview
```

This local smoke check builds the Web app with public-preview flags, starts an isolated preview server, verifies the preview access gate, verifies `/api/agent/status` stays disabled, verifies `/executors` renders the public-preview boundary, and scans for local paths, secret variable names, stack traces, or Agent startup details. It deliberately uses `METEORTEST_SMOKE_NO_SUPABASE=1`; the live Vercel preview should use the Supabase variables configured in Project Settings.

Open the deployment URL and check:

1. `/` loads.
2. `/projects` loads.
3. `/tasks` loads.
4. `/reports` loads.
5. `/builds` loads.
6. `/executors` loads without exposing local machine paths or a public Local Agent endpoint.
7. `/settings` loads.
8. API calls do not print secrets, service-role keys, local paths, or stack traces containing private values.
9. AI assistant shows a clear unavailable state if `DEEPSEEK_API_KEY` is not configured.

If a page fails, capture the Vercel deployment log lines and browser console/network errors, with secrets redacted.

## After The Preview URL Works

Only after the URL is verified:

1. Add the public MeteorTest Web preview link to the personal website.
2. Update `README.md`, `README.zh-CN.md`, `PROGRESS.md`, and `AGENTS.md`.
3. Keep Phase 12 public connected execution deferred unless the safety design is complete.

Then continue hardening in this order:

1. Public preview mode: make Agent startup impossible in public deployments and document the unavailable state.
2. Access protection: enable Vercel Deployment Protection, `METEORTEST_PREVIEW_ACCESS_TOKEN`, or an equivalent guard before long-lived public use.
3. Preview data: run `supabase/seed-preview.sql` to seed safe demo projects, suites, tasks, reports, executors, and builds.
4. Task/report experience: make failed-task analysis readable through status, logs, failure category, AI analysis, and next actions.
5. Private Agent loop: follow `docs/private-agent-preview-loop.md` to connect a private Local Agent to the preview backend only after the above is stable.

## References

- Vercel project settings: https://vercel.com/docs/project-configuration/project-settings
- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Next.js environment variables: https://nextjs.org/docs/pages/guides/environment-variables
- Private Agent preview loop: `docs/private-agent-preview-loop.md`
