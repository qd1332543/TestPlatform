export default function ExecutorsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">执行器</h1>
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">最近心跳</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">暂无执行器</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
