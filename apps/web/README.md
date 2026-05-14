# MeteorTest Web Console

This package contains the Next.js Web console for MeteorTest.

It owns:

- pages and layouts
- API routes
- Supabase server/client access
- AI assistant surfaces
- projects, tasks, builds, reports, executors, settings, login, and profile UI

## Local Development

```bash
npm ci
cp .env.local.example .env.local
npm run dev:local
```

Open:

```text
http://127.0.0.1:3000
```

`npm run dev:local` is the preferred local WebUI entry point. It binds to `127.0.0.1:3000`, handles the existing local process on that port, starts Next.js with local-preview safety defaults, and writes logs to `.next/dev-local.log`.

## Environment

Required local file:

```text
apps/web/.env.local
```

Expected keys:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEEPSEEK_API_KEY optional
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-visible. Keep `SUPABASE_SERVICE_ROLE_KEY` and `DEEPSEEK_API_KEY` server-only; never add the `NEXT_PUBLIC_` prefix to them.

Do not commit `.env.local` or real keys.

## Public Preview Boundary

Public preview deployment is documented in:

- `../../docs/vercel-public-preview.md`
- `../../docs/vercel-public-preview.zh-CN.md`

The Web deployment must not expose local repository paths, service-role keys, AI provider keys, or Local Agent runtime settings to the browser.

The Local Agent must not be exposed directly on the public internet. Connected execution should use a private Agent polling the backend. That validation flow is documented in:

- `../../docs/private-agent-preview-loop.md`
- `../../docs/private-agent-preview-loop.zh-CN.md`

Public-preview smoke check:

```bash
npm run smoke:public-preview
```

## UI And I18n

UI implementation rules live in `../../AGENTS.md`.

Key local rules:

- Use semantic theme tokens from `app/globals.css`; avoid page-level hard-coded colors.
- Add user-visible copy to `content/i18n.ts` first, then consume it through `getDictionary()` or `useLocale()`.
- Keep `zh-CN` and `en` content structures aligned.
- Browser-facing API responses should use DTO/View Model shapes and public refs, not raw internal UUIDs.

Visual validation checklist:

- `../../docs/webui-visual-checklist.md`
- `../../docs/webui-visual-checklist.zh-CN.md`

## Validation

```bash
npm run lint
npm run build
```

Use `npm run dev:local` when a UI change needs local visual validation.

