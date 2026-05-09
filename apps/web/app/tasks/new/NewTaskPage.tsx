import { createClient } from '@/lib/supabase/server'
import NewTaskForm from '@/components/NewTaskForm'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'

export default async function NewTaskPage() {
  const t = await getDictionary()
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
            <Link href="/tasks" className="hover:text-white transition-colors">{t.pages.tasks.title}</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{t.pages.newTask.breadcrumb}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t.pages.newTask.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.pages.newTask.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <NewTaskForm projects={projects ?? []} builds={builds ?? []} />
        <aside className="data-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">{t.pages.newTask.logicTitle}</div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.pages.newTask.logic}
            </p>
          </div>
          <div className="panel-inner rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.pages.newTask.orderTitle}</div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t.pages.newTask.order.map((item, index) => <div key={item}>{index + 1}. {item}</div>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
