import { createClient } from '@/lib/supabase/server'
import NewBuildForm from '@/components/NewBuildForm'
import Link from 'next/link'

export default async function NewBuildPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').order('name')
  return (
    <div className="space-y-6 w-full max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/builds" className="hover:text-white transition-colors">构建产物</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>登记构建</span>
          </div>
          <h1 className="text-2xl font-bold text-white">登记构建产物</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>把 App 包、版本和下载地址录入平台，供任务创建时关联。</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <NewBuildForm projects={projects ?? []} />
        <aside className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-sm font-semibold text-white">建议填写内容</div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              版本号、Build 号和 artifact_url 是核心字段。Bundle ID、Package Name 和 Git Commit 便于后续排查和回溯。
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ background: '#0A0F1E', border: '1px solid var(--border)' }}>
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>使用场景</div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>1. 回归测试前登记版本</div>
              <div>2. 任务创建时关联构建</div>
              <div>3. 报告页可回看结果链接</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
