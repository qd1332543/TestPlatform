import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const statusColor: Record<string, string> = {
  queued: 'text-gray-500', running: 'text-blue-500', succeeded: 'text-green-600',
  failed: 'text-red-500', cancelled: 'text-gray-400', timeout: 'text-orange-500',
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('*, projects(name), test_suites(name, command), executors(name), reports(*), ai_analyses(*)')
    .eq('id', id)
    .single()

  if (!task) notFound()

  const report = task.reports?.[0]
  const analysis = task.ai_analyses?.[0]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">任务详情</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">项目：</span>{task.projects?.name ?? '-'}</div>
          <div><span className="text-gray-500">套件：</span>{task.test_suites?.name ?? '-'}</div>
          <div><span className="text-gray-500">环境：</span>{task.environment}</div>
          <div><span className="text-gray-500">执行器：</span>{task.executors?.name ?? '-'}</div>
          <div><span className="text-gray-500">状态：</span><span className={`font-medium ${statusColor[task.status]}`}>{task.status}</span></div>
          <div><span className="text-gray-500">创建时间：</span>{new Date(task.created_at).toLocaleString('zh-CN')}</div>
          {task.started_at && <div><span className="text-gray-500">开始时间：</span>{new Date(task.started_at).toLocaleString('zh-CN')}</div>}
          {task.finished_at && <div><span className="text-gray-500">结束时间：</span>{new Date(task.finished_at).toLocaleString('zh-CN')}</div>}
        </div>
        {task.test_suites?.command && (
          <div><span className="text-gray-500">命令：</span><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{task.test_suites.command}</code></div>
        )}
      </div>

      {report && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium">测试报告</div>
          <div className="p-4 text-sm space-y-2">
            {report.summary && <p className="text-gray-700">{report.summary}</p>}
            {report.log_url && <a href={report.log_url} className="text-blue-600 hover:underline block">查看日志</a>}
            {report.allure_url && <a href={report.allure_url} className="text-blue-600 hover:underline block">查看 Allure 报告</a>}
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium">AI 失败分析</div>
          <div className="p-4 text-sm space-y-2">
            {analysis.failure_reason && <div><span className="text-gray-500">失败原因：</span>{analysis.failure_reason}</div>}
            {analysis.impact && <div><span className="text-gray-500">影响范围：</span>{analysis.impact}</div>}
            {analysis.suggestion && <div><span className="text-gray-500">修复建议：</span>{analysis.suggestion}</div>}
            {analysis.flaky_probability != null && <div><span className="text-gray-500">Flaky 概率：</span>{(analysis.flaky_probability * 100).toFixed(0)}%</div>}
          </div>
        </div>
      )}
    </div>
  )
}
