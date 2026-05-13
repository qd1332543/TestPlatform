import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTime, getDictionary, getLocale } from '@/lib/i18n'
import { demoBuilds, demoTasks, isLocalDemo } from '@/lib/localDemo'
import { buildRef, taskRef } from '@/lib/viewModels/displayRefs'

type BuildRow = {
  id: string; display_id?: string | null; platform: string; version: string; build_number: string | null
  artifact_url: string; created_at: string
  projects: { name: string } | { name: string }[] | null
}

type BuildTaskRow = {
  id: string
  display_id?: string | null
  app_build_id: string | null
  parameters?: { display_name?: string } | null
  status: string
  created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

const platformStyle: Record<string, { bg: string; color: string }> = {
  ios:     { bg: 'color-mix(in srgb, var(--accent-3) 14%, transparent)', color: 'var(--accent-3)' },
  android: { bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  web:     { bg: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' },
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  queued: { bg: 'var(--status-queued-bg)', color: 'var(--status-queued-text)' },
  running: { bg: 'var(--status-running-bg)', color: 'var(--status-running-text)' },
  succeeded: { bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  failed: { bg: 'var(--status-failed-bg)', color: 'var(--status-failed-text)' },
  cancelled: { bg: 'var(--status-queued-bg)', color: 'var(--status-queued-text)' },
  timeout: { bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
}

export default async function BuildsPage() {
  const locale = await getLocale()
  const t = await getDictionary()
  const supabase = isLocalDemo() ? null : await createClient()
  const { data: builds } = supabase
    ? await supabase
      .from('app_builds').select('id, display_id, platform, version, build_number, artifact_url, created_at, projects(name)')
      .order('created_at', { ascending: false }).limit(50)
    : { data: demoBuilds }
  const buildList = (builds ?? []) as BuildRow[]
  const buildIds = buildList.map(b => b.id)

  const { data: tasks } = supabase && buildIds.length
    ? await supabase
      .from('tasks')
      .select('id, display_id, app_build_id, parameters, status, created_at, projects(name), test_suites(name)')
      .in('app_build_id', buildIds)
      .order('created_at', { ascending: false })
    : { data: isLocalDemo() ? demoTasks.map((task, index) => ({ ...task, app_build_id: demoBuilds[index % demoBuilds.length]?.id ?? null })) : [] as BuildTaskRow[] }

  const taskList = (tasks ?? []) as BuildTaskRow[]
  const taskMap = taskList.reduce<Record<string, BuildTaskRow[]>>((acc, task) => {
    if (!task.app_build_id) return acc
    acc[task.app_build_id] = acc[task.app_build_id] ?? []
    acc[task.app_build_id].push(task)
    return acc
  }, {})
  const totalBuilds = buildList.length
  const iosBuilds = buildList.filter(b => b.platform === 'ios').length
  const androidBuilds = buildList.filter(b => b.platform === 'android').length
  const webBuilds = buildList.filter(b => b.platform === 'web').length

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.pages.builds.title}</h1>
          <p className="page-subtitle">{t.pages.builds.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-left text-xs sm:grid-cols-4 md:text-right" style={{ color: 'var(--text-muted)' }}>
          <div>{t.builds.total} {totalBuilds}</div>
          <div>iOS {iosBuilds}</div>
          <div>Android {androidBuilds}</div>
          <div>Web {webBuilds}</div>
        </div>
      </div>

      {!buildList.length ? (
        <div className="data-panel rounded-xl">
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.pages.builds.empty}
            <div className="mt-4">
              <Link href="/builds/new"
                className="primary-action px-4 py-2 rounded-lg text-sm font-semibold inline-flex">
                {t.pages.builds.newAction}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-stretch sm:justify-end">
            <Link href="/builds/new"
              className="primary-action inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold">
              {t.pages.builds.newAction}
            </Link>
          </div>
          {buildList.map((b) => {
            const ps = platformStyle[b.platform?.toLowerCase()] ?? platformStyle.ios
            const relatedTasks = taskMap[b.id] ?? []
            const ref = buildRef(b)
            return (
              <div key={b.id} className="data-panel rounded-xl p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium uppercase" style={{ background: ps.bg, color: ps.color, border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))' }}>{b.platform}</span>
                      <span className="text-sm font-medium text-white">{relationName(b.projects) ?? '-'}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.common.version} {b.version}</span>
                      <span className="status-badge status-queued px-2 py-0.5">{ref}</span>
                      {b.build_number && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.build} {b.build_number}</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.builds.registeredAt} {formatDateTime(b.created_at, locale)}
                    </div>
                  </div>
                  <a href={b.artifact_url} target="_blank" className="link-action text-sm shrink-0">{t.builds.download}</a>
                </div>

                <div className="panel-inner rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.builds.relatedTasks}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{relatedTasks.length} {t.builds.taskUnit}</div>
                  </div>
                  {relatedTasks.length ? (
                    <div className="space-y-2">
                      {relatedTasks.slice(0, 4).map(task => {
                        const s = statusStyle[task.status] ?? statusStyle.queued
                        const statusLabel = t.status[task.status as keyof typeof t.status] ?? task.status
                        const taskDisplayRef = taskRef(task)
                        return (
                          <Link key={task.id} href={`/tasks/${taskDisplayRef}`} className="soft-panel flex flex-col gap-3 rounded-lg px-3 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">{relationName(task.projects) ?? '-'}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{relationName(task.test_suites) ?? '-'} · {formatDateTime(task.created_at, locale)}</div>
                            </div>
                            <span className={`status-badge status-${task.status} px-2 py-0.5 shrink-0`} style={{ background: s.bg, color: s.color }}>{statusLabel}</span>
                          </Link>
                        )
                      })}
                      {relatedTasks.length > 4 && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.builds.hiddenTasks(relatedTasks.length - 4)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.builds.noRelatedTasks}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
