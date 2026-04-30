import { createClient } from '@/lib/supabase/server'
import NewBuildForm from '@/components/NewBuildForm'

export default async function NewBuildPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').order('name')
  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">登记构建产物</h1>
      <NewBuildForm projects={projects ?? []} />
    </div>
  )
}
