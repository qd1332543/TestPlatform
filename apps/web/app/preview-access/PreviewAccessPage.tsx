import { getDictionary } from '@/lib/i18n'
import { sanitizeNextPath } from '@/lib/previewAccess'

export default async function PreviewAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const t = await getDictionary()
  const { error, next } = await searchParams
  const nextPath = sanitizeNextPath(next)

  return (
    <div className="page-shell min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <section className="console-hero w-full max-w-xl rounded-2xl p-6">
        <div className="mb-6">
          <div className="kicker mb-3">{t.previewAccess.kicker}</div>
          <h1 className="page-title">{t.previewAccess.title}</h1>
          <p className="page-subtitle">{t.previewAccess.description}</p>
        </div>

        <form action="/api/preview-access" method="post" className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {t.previewAccess.tokenLabel}
            </span>
            <input
              className="field-input px-4 py-3"
              name="accessToken"
              type="password"
              autoComplete="current-password"
              required
              placeholder={t.previewAccess.tokenPlaceholder}
            />
          </label>

          {error ? (
            <div className="notice-banner rounded-xl px-4 py-3 text-sm" style={{ borderColor: 'var(--status-failed-text)' }}>
              {t.previewAccess.invalidToken}
            </div>
          ) : null}

          <button type="submit" className="primary-action w-full rounded-xl px-4 py-3 text-sm font-semibold">
            {t.previewAccess.submit}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
          {t.previewAccess.footer}
        </p>
      </section>
    </div>
  )
}
