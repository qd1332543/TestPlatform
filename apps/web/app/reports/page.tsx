export default function ReportsPage() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">报告中心</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>查看 AI 分析报告和测试结果</p>
      </div>
      <div className="rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无报告</div>
      </div>
    </div>
  )
}
