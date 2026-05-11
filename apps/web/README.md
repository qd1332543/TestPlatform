# MeteorTest Web Console

Next.js console for MeteorTest. It owns the dashboard, project center, task center, build artifact pages, report center, executor controls, settings, and AI assistant.

## Local Development

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required local environment file:

```text
apps/web/.env.local
```

Expected keys:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DEEPSEEK_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-visible client settings. Keep `DEEPSEEK_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` server-only; never add the `NEXT_PUBLIC_` prefix to them.

Do not commit `.env.local` or real keys.

## Public Preview Boundary

The Web console can be deployed as a public preview when its provider receives environment variables through protected deployment settings, for example Vercel, Netlify, Cloudflare Pages, or GitHub Actions secrets.

Current public preview:

```text
https://meteortest.jcmeteor.com/
```

Public preview is for viewing and validating the Web console surface first:

- It may connect to a dedicated preview Supabase project.
- It must not expose `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, local file paths, or local Agent runtime settings to the browser.
- It must not directly expose the Local Agent or a machine-local executor on the public internet.
- Real connected execution remains a separate step: the private Local Agent should poll the platform backend from the user's machine or trusted runner.

For a safe preview setup, start with empty data or demo data, then enable connected execution only after the backend policies, storage access, and Agent trust boundary are reviewed.

## Public Preview Deployment Runbook

Use this order when opening MeteorTest Web on the public internet:

1. Choose an application host that supports Next.js server routes, such as Vercel, Netlify, Cloudflare Workers/Pages with a server runtime, or a controlled server. Do not use GitHub Pages for MeteorTest Web because it cannot run `/api/*` routes.
2. Create a dedicated preview Supabase project or a clearly isolated preview schema. Run the migrations from `supabase/migrations/` and use demo or empty data first.
3. Configure deployment-provider environment variables:

   ```text
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   DEEPSEEK_API_KEY optional
   METEORTEST_AGENT_DISABLED=1
   METEORTEST_PUBLIC_PREVIEW=1
   METEORTEST_PREVIEW_ACCESS_TOKEN optional
   ```

4. Optionally set `METEORTEST_PREVIEW_ACCESS_TOKEN` to enable an app-level access gate for the public preview. Visitors must enter this token before pages load; API callers can send it through the `x-meteortest-preview-token` header.
5. Keep `METEORTEST_REPO_ROOT`, `METEORTEST_AGENT_PYTHON`, `METEORTEST_AGENT_INTERVAL`, local repository paths, and local Agent config out of the public Web deployment unless a reviewed execution-safety design exists.
6. Deploy `apps/web` with Node.js 22, `npm ci`, and `npm run build`.
7. Smoke-check the public URL:

   - Dashboard loads.
   - Projects, tasks, reports, builds, executors, and settings routes load.
   - API routes do not print secrets or local machine paths.
   - Executor controls do not expose a public Local Agent endpoint.
   - AI assistant returns a clear unavailable state if `DEEPSEEK_API_KEY` is not configured.

8. Only after the Web preview is stable, decide whether a private Local Agent should poll the preview backend with scoped credentials. Do not expose a machine-local Agent endpoint directly to public traffic.

Public-preview smoke check:

```bash
npm run smoke:public-preview
```

The smoke check builds the Web app with public-preview environment flags, starts an isolated local preview server, verifies the optional preview access gate, verifies `/api/agent/status` stays disabled, verifies `/executors` renders the public-preview boundary message, and scans responses for local paths, secret variable names, stack traces, or Agent startup details. It uses `METEORTEST_SMOKE_NO_SUPABASE=1` internally so CI can run without preview Supabase credentials; do not set this flag in Vercel. Real Vercel previews should use the configured preview Supabase environment and safe demo data.

Current follow-up order:

1. Harden public preview mode so public deployments never try to start a machine-local Agent.
2. Enable access protection before treating the preview as a long-lived public console. Use Vercel Deployment Protection, `METEORTEST_PREVIEW_ACCESS_TOKEN`, or both.
3. Seed safe demo data for dashboard, projects, tasks, reports, executors, and builds.
4. Improve task detail and report analysis surfaces around status, logs, failure category, AI analysis, and next actions.
5. Run a private Local Agent against the preview backend only after the preview boundary is stable.

For a detailed Vercel-specific walkthrough, see:

- `docs/vercel-public-preview.md`
- `docs/vercel-public-preview.zh-CN.md`

Preview seed data:

```text
supabase/seed-preview.sql
```

Run it after the migrations when you want the public preview to show safe demo projects, suites, tasks, reports, an offline demo executor, and AI analysis examples. The seed uses placeholder URLs and synthetic execution data only.

## UI Direction

The console should be visually consistent across pages. Use shared CSS variables and semantic classes from `app/globals.css` instead of hard-coded page colors.

Current theme options:

- `meteor`: 星流墨色, the default dark mint/gold console.
- `indigo`: 靛蓝瓷, a cooler indigo console.
- `dune`: 沙丘, a warm dark brown and amber console.
- `aurora`: 极光终端, a stronger terminal-inspired dark theme.
- `parchment`: 牛皮纸, a light paper-like theme for documents and reports.
- `sky`: 晴空蓝, a bright blue theme for daytime use.
- `glacier`: 冰湖银, a calm silver-blue theme with low-contrast controls.
- `sakura`: 樱花雾, a soft light pink theme.

Theme is stored in `meteortest.settings.v1` and applied through `ThemeController`.

## Internationalization

The Web console uses a typed content module first, and components consume copy from locale data instead of inline bilingual strings.

Initial target locales:

- `zh-CN`
- `en`

The implementation lives in:

```text
content/i18n.ts
lib/i18n.ts
lib/useLocale.ts
```

Locale normalization must use the shared `supportedLocales` list. Avoid one-off binary checks in components or API routes.

Server components should use `getLocale()` and `getDictionary()` from `lib/i18n.ts`. Client components should use `useLocale()` from `lib/useLocale.ts`.

The selected locale is stored in the `meteortest.locale` cookie and can be changed from Settings.

The current i18n pass covers navigation, page titles, settings, forms, table headers, empty states, status labels, and AI templates. New user-visible UI copy should be added to `content/i18n.ts` first, then consumed from code.

## Validation

```bash
npm run lint
npm run build
```
