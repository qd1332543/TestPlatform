'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/projects', label: '项目中心' },
  { href: '/tasks', label: '任务中心' },
  { href: '/reports', label: '报告中心' },
  { href: '/executors', label: '执行器' },
  { href: '/ai', label: 'AI 助手' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col py-6 px-3 shrink-0">
      <div className="text-sm font-bold text-gray-800 px-3 mb-6">Test Platform</div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded text-sm ${
              pathname === href
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
