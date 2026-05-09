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
   ```

4. Keep `METEORTEST_REPO_ROOT`, `METEORTEST_AGENT_PYTHON`, `METEORTEST_AGENT_INTERVAL`, local repository paths, and local Agent config out of the public Web deployment unless a reviewed execution-safety design exists.
5. Deploy `apps/web` with Node.js 22, `npm ci`, and `npm run build`.
6. Smoke-check the public URL:

   - Dashboard loads.
   - Projects, tasks, reports, builds, executors, and settings routes load.
   - API routes do not print secrets or local machine paths.
   - Executor controls do not expose a public Local Agent endpoint.
   - AI assistant returns a clear unavailable state if `DEEPSEEK_API_KEY` is not configured.

7. Only after the Web preview is stable, decide whether a private Local Agent should poll the preview backend with scoped credentials. Do not expose a machine-local Agent endpoint directly to public traffic.

For a detailed Vercel-specific walkthrough, see:

- `docs/vercel-public-preview.md`
- `docs/vercel-public-preview.zh-CN.md`

## UI Direction

The console should be visually consistent across pages. Use shared CSS variables and semantic classes from `app/globals.css` instead of hard-coded page colors.

Current theme options:

- `meteor`: 星流墨色, the default dark mint/gold console.
- `indigo`: 靛蓝瓷, a cooler indigo console.
- `forest`: 森林墨, a low-saturation green console.
- `aurora`: 极光终端, a stronger terminal-inspired dark theme.

Theme is stored in `meteortest.settings.v1` and applied through `ThemeController`.

## Internationalization Plan

Multilingual UI is planned. Follow the `junchen-meteor` style: typed content modules first, components consume copy from locale data.

Initial target locales:

- `zh-CN`
- `en`

The foundation lives in:

```text
content/i18n.ts
lib/i18n.ts
lib/useLocale.ts
```

Locale normalization must use the shared `supportedLocales` list. Avoid one-off binary checks in components or API routes.

The first i18n pass should cover navigation, page titles, settings, forms, empty states, AI templates, and common validation messages.

## Validation

```bash
npm run lint
npm run build
```
