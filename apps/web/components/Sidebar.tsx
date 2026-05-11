'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/useLocale'

const settingsKey = 'meteortest.settings.v1'
const settingsUpdatedEvent = 'meteortest-settings-updated'
const defaultPlatformName = '星流测试台'

function normalizePlatformName(value?: string) {
  const name = value?.trim()
  if (!name) return defaultPlatformName
  return name
}

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

export default function Sidebar() {
  const pathname = usePathname()
  const { dictionary: t } = useLocale()
  const [collapsed, setCollapsed] = useState(false)
  const [platformName, setPlatformName] = useState(defaultPlatformName)
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const aiItem = { href: '/ai', label: t.common.aiAssistant, icon: Icons.ai }
  const navItems = [
    { href: '/', label: t.common.dashboard, icon: Icons.dashboard },
    { href: '/projects', label: t.common.projects, icon: Icons.projects },
    { href: '/tasks', label: t.common.tasks, icon: Icons.tasks },
    { href: '/reports', label: t.common.reports, icon: Icons.reports },
    { href: '/builds', label: t.common.builds, icon: Icons.builds },
    { href: '/executors', label: t.common.executors, icon: Icons.executors },
  ]

  useEffect(() => {
    const loadName = () => {
      const raw = window.localStorage.getItem(settingsKey)
      if (!raw) {
        setPlatformName(defaultPlatformName)
        return
      }
      try {
        const settings = JSON.parse(raw) as { platformName?: string }
        setPlatformName(normalizePlatformName(settings.platformName))
      } catch {
        setPlatformName(defaultPlatformName)
      }
    }

    queueMicrotask(loadName)
    window.addEventListener('storage', loadName)
    window.addEventListener(settingsUpdatedEvent, loadName)
    return () => {
      window.removeEventListener('storage', loadName)
      window.removeEventListener(settingsUpdatedEvent, loadName)
    }
  }, [])

  const navLinkStyle = (href: string) => isActive(href)
    ? { background: 'var(--surface-soft)', color: 'var(--text-primary)', fontWeight: 600, border: '1px solid var(--border)' }
    : { color: 'var(--text-secondary)' }

  return (
    <>
    <header
      className="md:hidden sticky top-0 z-30 overflow-hidden border-b backdrop-blur"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span className="brand-orbit" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{platformName}</div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.common.automationPlatform}</div>
        </div>
        <Link
          href={aiItem.href}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
          style={isActive(aiItem.href)
            ? { background: 'color-mix(in srgb, var(--accent) 24%, transparent)', color: 'var(--text-primary)', border: '1px solid color-mix(in srgb, var(--accent) 42%, transparent)' }
            : { background: 'var(--surface-soft)', color: 'var(--accent)', border: '1px solid var(--border)' }
          }
        >
          {aiItem.label}
        </Link>
      </div>
      <nav className="quiet-scrollbar flex max-w-full gap-2 overflow-x-auto px-3 pb-3">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={navLinkStyle(href)}
          >
            <span className="shrink-0">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
        <Link
          href="/settings"
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={navLinkStyle('/settings')}
        >
          <span className="shrink-0">{Icons.settings}</span>
          <span>{t.common.settings}</span>
        </Link>
      </nav>
    </header>
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} hidden md:flex flex-col py-5 shrink-0 transition-all duration-200 border-r backdrop-blur`}
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 mb-7 h-10">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="brand-orbit" />
            <div className="min-w-0">
              <div className="text-white font-bold text-sm tracking-wide whitespace-nowrap truncate">{platformName}</div>
            <div className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{t.common.automationPlatform}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ml-auto"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={collapsed ? t.common.expand : t.common.collapse}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.2"/>
            {collapsed ? (
              <path d="M10 6.5l2.5 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12.5 6.5L10 9l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>

      <div className="px-2 mb-4">
        <Link href={aiItem.href} title={collapsed ? aiItem.label : undefined}
          className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${collapsed ? 'justify-center' : ''}`}
          style={isActive(aiItem.href)
            ? { background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent-2) 12%, transparent))', color: 'var(--text-primary)', border: '1px solid color-mix(in srgb, var(--accent) 42%, transparent)', boxShadow: '0 16px 42px color-mix(in srgb, var(--bg-base) 22%, transparent)' }
            : { background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)' }
          }
        >
          <span className="shrink-0">{aiItem.icon}</span>
          {!collapsed && <span>{aiItem.label}</span>}
        </Link>
      </div>

      {!collapsed && <div className="text-xs px-4 mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.common.navigation}</div>}

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ href, label, icon }) => (
          <Link key={href} href={href} title={collapsed ? label : undefined}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
            style={isActive(href)
              ? { background: 'var(--surface-soft)', color: 'var(--text-primary)', fontWeight: 600, border: '1px solid var(--border)' }
              : { color: 'var(--text-secondary)' }
            }
          >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="px-2 mt-4 pt-1">
        <Link href="/settings" title={collapsed ? t.common.settings : undefined}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
          style={isActive('/settings')
            ? { background: 'var(--surface-soft)', color: 'var(--text-primary)', fontWeight: 600, border: '1px solid var(--border)' }
            : { color: 'var(--text-muted)' }
          }
        >
          <span className="shrink-0">{Icons.settings}</span>
          {!collapsed && <span>{t.common.settings}</span>}
        </Link>
      </div>
    </aside>
    </>
  )
}
