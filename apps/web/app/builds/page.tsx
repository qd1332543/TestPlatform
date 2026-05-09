import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type BuildRow = {
  id: string; platform: string; version: string; build_number: string | null
  artifact_url: string; created_at: string
  projects: { name: string } | { name: string }[] | null
}

type BuildTaskRow = {
  id: string
  app_build_id: string | null
  status: string
  created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

const platformStyle: Record<string, { bg: string; color: string }> = {
  ios:     { bg: '#0D1829', color: '#60A5FA' },
  android: { bg: '#0D2818', color: '#22C55E' },
  web:     { bg: '#1a1040', color: '#A78BFA' },
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  queued: { bg: '#1a2438', color: '#64748B', label: '排队中' },
  running: { bg: '#0D1F3C', color: '#3B82F6', label: '执行中' },
  succeeded: { bg: '#0D2818', color: '#22C55E', label: '成功' },
  failed: { bg: '#2A0F0F', color: '#EF4444', label: '失败' },
  cancelled: { bg: '#1a2438', color: '#475569', label: '已取消' },
  timeout: { bg: '#2A1A0A', color: '#F97316', label: '超时' },
}

export default async function BuildsPage() {
  const supabase = await createClient()
  const { data: builds } = await supabase
    .from('app_builds').select('*, projects(name)')
    .order('created_at', { ascending: false }).limit(50)
  const buildList = (builds ?? []) as BuildRow[]
  const buildIds = buildList.map(b => b.id)

  const { data: tasks } = buildIds.length
    ? await supabase
      .from('tasks')
      .select('id, app_build_id, status, created_at, projects(name), test_suites(name)')
      .in('app_build_id', buildIds)
      .order('created_at', { ascending: false })
    : { data: [] as BuildTaskRow[] }

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
          <h1 className="page-title">构建产物</h1>
          <p className="page-subtitle">管理应用构建版本，并查看它们对应的测试任务结果</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>总数 {totalBuilds}</div>
          <div>iOS {iosBuilds}</div>
          <div>Android {androidBuilds}</div>
          <div>Web {webBuilds}</div>
        </div>
      </div>

      {!buildList.length ? (
        <div className="data-panel rounded-xl">
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            暂无构建产物。先在右上角登记一个 App 包，再在任务中心关联它。
            <div className="mt-4">
              <Link href="/builds/new"
                className="primary-action px-4 py-2 rounded-lg text-sm font-semibold inline-flex">
                + 登记构建
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href="/builds/new"
              className="primary-action px-4 py-2 rounded-lg text-sm font-semibold">
              + 登记构建
            </Link>
          </div>
          {buildList.map((b) => {
            const ps = platformStyle[b.platform?.toLowerCase()] ?? platformStyle.ios
            const relatedTasks = taskMap[b.id] ?? []
            return (
              <div key={b.id} className="data-panel rounded-xl p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium uppercase" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}30` }}>{b.platform}</span>
                      <span className="text-sm font-medium text-white">{relationName(b.projects) ?? '-'}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Version {b.version}</span>
                      {b.build_number && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Build {b.build_number}</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      登记时间 {new Date(b.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <a href={b.artifact_url} target="_blank" className="link-action text-sm shrink-0">下载产物 →</a>
                </div>

                <div className="panel-inner rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>关联任务</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{relatedTasks.length} 条</div>
                  </div>
                  {relatedTasks.length ? (
                    <div className="space-y-2">
                      {relatedTasks.slice(0, 4).map(task => {
                        const s = statusStyle[task.status] ?? statusStyle.queued
                        return (
                          <Link key={task.id} href={`/tasks/${task.id}`} className="soft-panel flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">{relationName(task.projects) ?? '-'}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{relationName(task.test_suites) ?? '-'} · {new Date(task.created_at).toLocaleString('zh-CN')}</div>
                            </div>
                            <span className={`status-badge status-${task.status} px-2 py-0.5 shrink-0`}>{s.label}</span>
                          </Link>
                        )
                      })}
                      {relatedTasks.length > 4 && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>还有 {relatedTasks.length - 4} 条任务未展示</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>还没有任务引用这个构建产物。创建任务时选择该 App 包后，这里会显示关联记录。</div>
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
