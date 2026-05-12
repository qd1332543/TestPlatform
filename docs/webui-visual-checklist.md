# MeteorTest WebUI Visual Checklist

Use this checklist after WebUI layout, theme, or responsive changes.

## Local Preview

```bash
cd apps/web
npm run dev:local
```

Open `http://127.0.0.1:3000/`.

## Viewports

- Mobile: `390 x 844`
- Small browser screen, 12-14 inch laptop class: `1280 x 800`
- Regular desktop: `1440 x 900`
- Wide desktop: `2560 x 1100`
- 4K-style desktop: `3560 x 1100`

## Pages

- Dashboard: `/`
- Projects: `/projects`
- Tasks: `/tasks`
- Reports: `/reports`
- Builds: `/builds`
- Executors: `/executors`
- Settings: `/settings`
- AI Center: `/ai`

## Themes

Check at least these themes when UI colors change:

- `meteor`
- `parchment`
- `sky`
- `glacier`
- `sakura`
- `dune`

## Acceptance Criteria

- No page returns 500 or a runtime error.
- Mobile pages do not require horizontal scrolling for primary content.
- Tables that carry primary workflow information have a readable mobile card view or a deliberate scroll container.
- Primary actions, selected states, links, status badges, forms, and AI message cards use semantic tokens instead of hard-coded page colors.
- Text contrast follows the actual component background: dark backgrounds use light text, light backgrounds use dark text.
- Settings changes that affect theme, language, density, or layout are reflected in both code and documentation.
- Desktop layouts use proportional columns for main content and side panels; mobile remains single-column unless a page has a deliberate mobile-specific pattern.
