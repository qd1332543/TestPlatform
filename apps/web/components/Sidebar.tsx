'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const Icons = {
  ai: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C8 1.5 9.5 4 12.5 4.5C12.5 4.5 10 6.5 10.5 9.5C10.5 9.5 8.5 8 6 9.5C6 9.5 6.5 7 4 5.5C4 5.5 6.5 5 8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="3" cy="12" r="1.2" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="13" cy="11" r="0.9" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M3 10.5V9M13 9.8V8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5C2 4.4 2.9 3.5 4 3.5H6.5L7.5 5H12C13.1 5 14 5.9 14 7V12C14 13.1 13.1 14 12 14H4C2.9 14 2 13.1 2 12V5.5Z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 9.5H10.5M5.5 11.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 5.5H11M5 8H11M5 10.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9.5 10l1.5 1.5L13 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  builds: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8 1.5V14.5M2 5L8 8.5L14 5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  executors: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 7L7.5 9L5.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 11H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.7 3.3L11.6 4.4M4.4 11.6L3.3 12.7M12.7 12.7L11.6 11.6M4.4 4.4L3.3 3.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
}

const aiItem = { href: '/ai', label: 'AI 助手', icon: Icons.ai }
const navItems = [
  { href: '/', label: 'Dashboard', icon: Icons.dashboard },
  { href: '/projects', label: '项目中心', icon: Icons.projects },
  { href: '/tasks', label: '任务中心', icon: Icons.tasks },
  { href: '/reports', label: '报告中心', icon: Icons.reports },
  { href: '/builds', label: '构建产物', icon: Icons.builds },
  { href: '/executors', label: '执行器', icon: Icons.executors },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-52'} flex flex-col py-5 shrink-0 transition-all duration-200 border-r`}
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 mb-6 h-9">
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm tracking-wide whitespace-nowrap">TestPlatform</div>
            <div className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>自动化测试平台</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0 ml-auto"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={collapsed ? '展开' : '收起'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>
      </div>

      <div className="px-2 mb-4">
        <Link href={aiItem.href} title={collapsed ? aiItem.label : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${collapsed ? 'justify-center' : ''}`}
          style={isActive(aiItem.href)
            ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', boxShadow: '0 4px 15px #3B82F640' }
            : { background: '#0D1829', color: '#60A5FA', border: '1px solid #1E3A5F' }
          }
        >
          <span className="shrink-0">{aiItem.icon}</span>
          {!collapsed && <span>{aiItem.label}</span>}
        </Link>
      </div>

      {!collapsed && <div className="text-xs px-4 mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>导航</div>}

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ href, label, icon }) => (
          <Link key={href} href={href} title={collapsed ? label : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
            style={isActive(href)
              ? { background: 'var(--bg-card)', color: '#fff', fontWeight: 500 }
              : { color: 'var(--text-secondary)' }
            }
          >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="px-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href="/settings" title={collapsed ? '设置' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="shrink-0">{Icons.settings}</span>
          {!collapsed && <span>设置</span>}
        </Link>
      </div>
    </aside>
  )
}
