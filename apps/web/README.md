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

The first i18n pass should cover navigation, page titles, settings, forms, empty states, AI templates, and common validation messages.

## Validation

```bash
npm run lint
npm run build
```
