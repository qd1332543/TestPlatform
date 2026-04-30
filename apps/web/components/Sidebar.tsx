'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const aiItem = { href: '/ai', label: 'AI 助手', icon: '✦' }
const navItems = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/projects', label: '项目中心', icon: '◫' },
  { href: '/tasks', label: '任务中心', icon: '◈' },
  { href: '/reports', label: '报告中心', icon: '◉' },
  { href: '/builds', label: '构建产物', icon: '⬡' },
  { href: '/executors', label: '执行器', icon: '◎' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-52'} bg-gray-950 flex flex-col py-6 px-2 shrink-0 transition-all duration-200`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 mb-8`}>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base tracking-wide">TestPlatform</div>
            <div className="text-gray-500 text-xs mt-0.5">自动化测试平台</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <Link
        href={aiItem.href}
        title={collapsed ? aiItem.label : undefined}
        className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2.5 rounded-lg mb-4 text-sm font-medium transition-colors ${
          isActive(aiItem.href)
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
            : 'bg-indigo-950 text-indigo-300 hover:bg-indigo-900 hover:text-white border border-indigo-800'
        }`}
      >
        <span className="text-base shrink-0">{aiItem.icon}</span>
        {!collapsed && aiItem.label}
      </Link>

      {!collapsed && <div className="text-gray-600 text-xs px-2 mb-2 uppercase tracking-wider">导航</div>}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 rounded-lg text-sm transition-colors ${
              isActive(href)
                ? 'bg-gray-800 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
            }`}
          >
            <span className="text-xs opacity-70 shrink-0">{icon}</span>
            {!collapsed && label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
