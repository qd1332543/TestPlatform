import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  queued:    { bg: '#1a2438', color: '#64748B', label: '排队中' },
  running:   { bg: '#0D1F3C', color: '#3B82F6', label: '执行中' },
  succeeded: { bg: '#0D2818', color: '#22C55E', label: '成功' },
  failed:    { bg: '#2A0F0F', color: '#EF4444', label: '失败' },
  cancelled: { bg: '#1a2438', color: '#475569', label: '已取消' },
  timeout:   { bg: '#2A1A0A', color: '#F97316', label: '超时' },
}

type TaskRow = {
  id: string; status: string; environment: string; created_at: string
  projects: { name: string } | { name: string }[] | null
  test_suites: { name: string } | { name: string }[] | null
  executors: { name: string } | { name: string }[] | null
}

function relationName(r: { name: string } | { name: string }[] | null) {
  return Array.isArray(r) ? r[0]?.name : r?.name
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name), executors(name)')
    .order('created_at', { ascending: false }).limit(50)
  if (status) query = query.eq('status', status)
  const { data: tasks } = await query

  const filters = [
    { label: '全部', value: '' },
    { label: '排队中', value: 'queued' },
    { label: '执行中', value: 'running' },
    { label: '成功', value: 'succeeded' },
    { label: '失败', value: 'failed' },
    { label: '超时', value: 'timeout' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">任务中心</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>查看和管理测试任务</p>
        </div>
        <Link href="/tasks/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
          + 新建任务
        </Link>
      </div>

      <div className="flex gap-2">
        {filters.map(f => {
          const active = status === f.value || (!status && !f.value)
          return (
            <Link key={f.value}
              href={f.value ? `/tasks?status=${f.value}` : '/tasks'}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={active
                ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }
                : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
              }
            >{f.label}</Link>
          )
        })}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['项目', '套件', '环境', '状态', '执行器', '时间', '操作'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!tasks?.length ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>暂无任务</td></tr>
            ) : (tasks as TaskRow[]).map((t) => {
              const s = statusStyle[t.status] ?? statusStyle.queued
              return (
                <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-white">{relationName(t.projects) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{relationName(t.test_suites) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{t.environment}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{relationName(t.executors) ?? '-'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/tasks/${t.id}`} className="text-sm font-medium" style={{ color: '#3B82F6' }}>详情 →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
