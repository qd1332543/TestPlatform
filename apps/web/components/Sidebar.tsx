'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const aiItem = { href: '/ai', label: 'AI 助手', icon: '✦' }
const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/projects', label: '项目中心', icon: '⊟' },
  { href: '/tasks', label: '任务中心', icon: '⊠' },
  { href: '/reports', label: '报告中心', icon: '⊡' },
  { href: '/builds', label: '构建产物', icon: '⬡' },
  { href: '/executors', label: '执行器', icon: '⊙' },
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
      {/* Header */}
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

      {/* AI 助手 */}
      <div className="px-2 mb-4">
        <Link
          href={aiItem.href}
          title={collapsed ? aiItem.label : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${collapsed ? 'justify-center' : ''}`}
          style={isActive(aiItem.href)
            ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', boxShadow: '0 4px 15px #3B82F640' }
            : { background: '#0D1829', color: '#60A5FA', border: '1px solid #1E3A5F' }
          }
        >
          <span className="text-base leading-none shrink-0">{aiItem.icon}</span>
          {!collapsed && <span>{aiItem.label}</span>}
        </Link>
      </div>

      {/* Nav label */}
      {!collapsed && (
        <div className="text-xs px-4 mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>导航</div>
      )}

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
            style={isActive(href)
              ? { background: 'var(--bg-card)', color: '#fff', fontWeight: 500 }
              : { color: 'var(--text-secondary)' }
            }
          >
            <span className="text-sm leading-none shrink-0 opacity-70">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/settings"
          title={collapsed ? '设置' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
            <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M12.2 7.5c0-.2 0-.4-.1-.6l1.3-1-1-1.7-1.5.5c-.3-.3-.7-.5-1.1-.7L9.5 2.5h-2l-.3 1.5c-.4.2-.8.4-1.1.7l-1.5-.5-1 1.7 1.3 1c0 .2-.1.4-.1.6s0 .4.1.6l-1.3 1 1 1.7 1.5-.5c.3.3.7.5 1.1.7l.3 1.5h2l.3-1.5c.4-.2.8-.4 1.1-.7l1.5.5 1-1.7-1.3-1c.1-.2.1-.4.1-.6z" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          {!collapsed && <span>设置</span>}
        </Link>
      </div>
    </aside>
  )
}
