import { createClient } from '@/lib/supabase/server'
import NewTaskForm from '@/components/NewTaskForm'
import Link from 'next/link'

export default async function NewTaskPage() {
  const supabase = await createClient()
  const [{ data: projects }, { data: builds }] = await Promise.all([
    supabase.from('projects').select('id, name, test_suites(id, name, project_id)').order('name'),
    supabase.from('app_builds').select('id, version, build_number, platform, project_id').order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6 w-full max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/tasks" className="hover:text-white transition-colors">任务中心</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>新建任务</span>
          </div>
          <h1 className="text-2xl font-bold text-white">新建任务</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>选择项目、套件、环境和构建产物，创建一次测试执行。</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <NewTaskForm projects={projects ?? []} builds={builds ?? []} />
        <aside className="data-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">任务创建逻辑</div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              先选项目，再选该项目下的测试套件。构建产物是可选项，但如果要复现移动端或 Web 版本问题，建议同时关联。
            </p>
          </div>
          <div className="panel-inner rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>建议顺序</div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>1. 任务名由 AI 或手动指定</div>
              <div>2. 环境决定执行目标</div>
              <div>3. 执行器会轮询 queued 任务</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
