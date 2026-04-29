import { createClient } from '@/lib/supabase/server'
import NewTaskForm from '@/components/NewTaskForm'

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, test_suites(id, name, project_id)')
    .order('name')

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">新建任务</h1>
      <NewTaskForm projects={projects ?? []} />
    </div>
  )
}
