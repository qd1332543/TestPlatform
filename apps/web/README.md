# MeteorTest Web Console

Next.js console for MeteorTest. It owns the dashboard, project center, task center, build artifact pages, report center, executor controls, settings, and AI assistant.

## Local Development

```bash
npm ci
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

Do not commit `.env.local`.

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
