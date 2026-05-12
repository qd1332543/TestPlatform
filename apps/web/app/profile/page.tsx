import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n'
import { getCurrentRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import ProfileForms from './ProfileForms'

export default async function ProfilePage() {
  const t = await getDictionary()
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) redirect('/login?next=/profile')

  const role = await getCurrentRole()
  const [{ data: profile }, { data: feedbacks }] = await Promise.all([
    supabase.from('profiles').select('username, phone, email, display_name, avatar_url, role').eq('id', user.id).single(),
    supabase.from('feedbacks').select('id, category, status, message, created_at').order('created_at', { ascending: false }).limit(5),
  ])
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : '-'
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-'
  const displayName = profile?.display_name ?? ''
  const avatarUrl = profile?.avatar_url ?? ''
  const username = profile?.username ?? ''
  const phone = profile?.phone ?? user.phone ?? ''
  const email = profile?.email ?? user.email ?? ''
  const primaryAccount = username || phone || email
  const avatarLabel = (displayName || primaryAccount || 'U').slice(0, 1).toUpperCase()

  return (
    <div className="page-shell space-y-6">
      <div>
        <div className="kicker mb-3">{t.profile.kicker}</div>
        <h1 className="page-title">{t.profile.title}</h1>
        <p className="page-subtitle">{t.profile.subtitle}</p>
      </div>

      <div className="proportional-layout">
        <section className="data-panel rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl text-base font-bold" style={{ background: 'var(--surface-soft)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                {avatarLabel}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white truncate">{displayName || primaryAccount || t.profile.unknownEmail}</div>
              {displayName ? <div className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{primaryAccount}</div> : null}
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.profile.roleLabel}: {role ?? 'viewer'}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label={t.profile.userId} value={user.id} />
            <Info label={t.profile.username} value={username || '-'} />
            <Info label={t.profile.phone} value={phone || '-'} />
            <Info label={t.profile.email} value={email || '-'} />
            <Info label={t.profile.createdAt} value={createdAt} />
            <Info label={t.profile.lastSignInAt} value={lastSignInAt} />
          </div>

          <form action="/api/auth/logout" method="post">
            <button type="submit" className="secondary-action rounded-lg px-4 py-2.5 text-sm font-semibold">
              {t.auth.logout}
            </button>
          </form>
        </section>

        <aside className="data-panel rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">{t.profile.permissionsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.profile.permissionsDesc}
            </p>
          </div>
          <div className="panel-inner rounded-lg p-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t.profile.roles.map(item => (
              <div key={item.name}>
                <span className="font-semibold text-white">{item.name}</span>
                <span> · {item.desc}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <ProfileForms
        labels={t.profile}
        initialProfile={{ display_name: displayName, avatar_url: avatarUrl }}
        feedbacks={(feedbacks ?? []).map(item => ({
          id: item.id,
          category: item.category,
          status: item.status,
          message: item.message,
          created_at: item.created_at,
        }))}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-inner rounded-lg p-4 min-w-0">
      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="mt-1 truncate text-sm" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
