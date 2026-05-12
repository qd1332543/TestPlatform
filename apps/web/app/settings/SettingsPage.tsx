'use client'

import { useEffect, useMemo, useState } from 'react'
import { dictionaries, supportedLocales, type Locale } from '@/content/i18n'
import { setLocaleCookie, useLocale } from '@/lib/useLocale'
import {
  defaultAccountPreferences,
  normalizeAccountPreferences,
  preferenceStorageKey,
  settingsUpdatedEvent,
  type AccountPreferences,
} from '@/lib/account/preferences'

type Settings = AccountPreferences & {
  taskTimeout: number
  maxParallelTasks: number
  retryCount: number
  reportRetentionDays: number
  autoStartAgent: boolean
  aiProvider: 'deepseek' | 'openai' | 'custom'
  notifyOnFailure: boolean
  notifyOnRecovery: boolean
  webhookUrl: string
  emailRecipients: string
}

type AgentStatus = {
  available?: boolean
  publicPreview?: boolean
  disabledReason?: string
}

const defaultSettings: Settings = {
  ...defaultAccountPreferences,
  taskTimeout: 1800,
  maxParallelTasks: 4,
  retryCount: 1,
  reportRetentionDays: 30,
  autoStartAgent: true,
  aiProvider: 'deepseek',
  notifyOnFailure: true,
  notifyOnRecovery: false,
  webhookUrl: '',
  emailRecipients: '',
}

function normalizeSettings(value: Partial<Settings>): Settings {
  const preferences = normalizeAccountPreferences(value)
  return { ...defaultSettings, ...value, ...preferences }
}

const inputClass = 'field-input px-3 py-2.5 text-sm'

function applyTheme(theme: Settings['theme']) {
  if (theme === 'meteor') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.dataset.theme = theme
  }
}

function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="toggle-control disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="toggle-thumb" />
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="data-panel rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { locale, dictionary: t } = useLocale()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [savedSettings, setSavedSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [headerProgress, setHeaderProgress] = useState(0)
  const [compactHeader, setCompactHeader] = useState(false)
  const agentControlsDisabled = agentStatus?.available === false

  useEffect(() => {
    const raw = window.localStorage.getItem(preferenceStorageKey)
    if (raw) {
      try {
        const parsed = normalizeSettings(JSON.parse(raw) as Partial<Settings>)
        window.localStorage.setItem(preferenceStorageKey, JSON.stringify(parsed))
        queueMicrotask(() => {
          setSettings(parsed)
          setSavedSettings(parsed)
        })
      } catch {
        queueMicrotask(() => {
          setSettings(defaultSettings)
          setSavedSettings(defaultSettings)
        })
      }
    }
    queueMicrotask(() => setLoaded(true))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPreferences() {
      try {
        const res = await fetch('/api/preferences', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as { preferences?: Partial<AccountPreferences> }
        if (cancelled || !data.preferences) return
        const merged = normalizeSettings({ ...settings, ...data.preferences })
        window.localStorage.setItem(preferenceStorageKey, JSON.stringify(merged))
        applyTheme(merged.theme)
        setSettings(merged)
        setSavedSettings(merged)
        window.dispatchEvent(new Event(settingsUpdatedEvent))
      } catch {}
    }

    loadPreferences()
    return () => {
      cancelled = true
    }
  // Load account preferences once after local fallback initialization.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAgentStatus() {
      try {
        const res = await fetch('/api/agent/status', { cache: 'no-store' })
        const data = await res.json() as AgentStatus
        if (!cancelled) setAgentStatus(data)
      } catch {
        if (!cancelled) setAgentStatus(null)
      }
    }

    loadAgentStatus()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const scrollRoot = document.querySelector('.app-main')
    const updateHeader = () => {
      const scrollTop = scrollRoot instanceof HTMLElement ? scrollRoot.scrollTop : window.scrollY
      setHeaderProgress(Math.min(1, Math.max(0, scrollTop / 48)))
    }

    updateHeader()
    scrollRoot?.addEventListener('scroll', updateHeader, { passive: true })
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => {
      scrollRoot?.removeEventListener('scroll', updateHeader)
      window.removeEventListener('scroll', updateHeader)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setCompactHeader(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const headerBgStrength = compactHeader ? 42 : 64
  const headerBorderStrength = compactHeader ? 48 : 72
  const headerBlur = compactHeader ? 10 : 16

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  )

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'theme') applyTheme(value as Settings['theme'])
    setSavedAt(null)
  }

  async function save() {
    const normalized = normalizeSettings(settings)
    window.localStorage.setItem(preferenceStorageKey, JSON.stringify(normalized))
    setLocaleCookie(normalized.locale)
    applyTheme(normalized.theme)
    window.dispatchEvent(new Event(settingsUpdatedEvent))
    setSettings(normalized)
    setSavedSettings(normalized)
    setSavedAt(new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    try {
      await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })
    } catch {}
  }

  function reset() {
    setSettings(defaultSettings)
    applyTheme(defaultSettings.theme)
    setSavedAt(null)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meteortest-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full space-y-6">
      <div className="sticky -top-4 z-20 -mx-3 flex flex-col gap-4 px-3 py-4 transition-[background,border-color,backdrop-filter] duration-300 ease-out sm:-mx-4 sm:px-4 md:-top-6 md:-mx-6 md:flex-row md:items-end md:justify-between md:px-6"
        style={{
          background: `color-mix(in srgb, var(--bg-base) ${Math.round(headerProgress * headerBgStrength)}%, transparent)`,
          borderBottom: `1px solid color-mix(in srgb, var(--border) ${Math.round(headerProgress * headerBorderStrength)}%, transparent)`,
          backdropFilter: `blur(${Math.round(headerProgress * headerBlur)}px)`,
        }}>
        <div>
          <h1 className="text-2xl font-bold text-white">{t.settings.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.settings.subtitle}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={exportJson}
            className="secondary-action px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {t.common.export}
          </button>
          <button
            type="button"
            onClick={reset}
            className="secondary-action px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {t.common.reset}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!loaded || !dirty}
            className="primary-action px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.common.save}
          </button>
        </div>
      </div>

      {(dirty || savedAt) && (
        <div
          className={`notice-banner rounded-lg px-4 py-3 text-sm ${dirty ? 'is-dirty' : 'is-saved'}`}
        >
          {dirty ? t.settings.dirty : t.settings.saved(savedAt ?? t.settings.savedFallback)}
        </div>
      )}

      <div className="settings-console-grid">
        <div className="settings-panel-grid">
          <Panel title={t.settings.platformDefaults} description={t.settings.platformDefaultsDesc}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t.settings.platformName}>
                <input
                  className={inputClass}
                  value={settings.platformName}
                  onChange={e => update('platformName', e.target.value)}
                />
              </Field>
              <Field label={t.settings.defaultEnvironment}>
                <select
                  className={inputClass}
                  value={settings.defaultEnvironment}
                  onChange={e => update('defaultEnvironment', e.target.value as Settings['defaultEnvironment'])}
                >
                  {['dev', 'staging', 'prod'].map(env => <option key={env} value={env}>{env}</option>)}
                </select>
              </Field>
              <Field label={t.settings.taskTimeout} hint={t.settings.seconds}>
                <input
                  type="number"
                  min={60}
                  step={60}
                  className={inputClass}
                  value={settings.taskTimeout}
                  onChange={e => update('taskTimeout', Number(e.target.value))}
                />
              </Field>
              <Field label={t.settings.maxParallelTasks}>
                <input
                  type="number"
                  min={1}
                  max={32}
                  className={inputClass}
                  value={settings.maxParallelTasks}
                  onChange={e => update('maxParallelTasks', Number(e.target.value))}
                />
              </Field>
              <Field label={t.settings.retryCount}>
                <input
                  type="number"
                  min={0}
                  max={5}
                  className={inputClass}
                  value={settings.retryCount}
                  onChange={e => update('retryCount', Number(e.target.value))}
                />
              </Field>
              <Field label={t.settings.reportRetentionDays}>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={inputClass}
                  value={settings.reportRetentionDays}
                  onChange={e => update('reportRetentionDays', Number(e.target.value))}
                />
              </Field>
            </div>
          </Panel>

          <Panel title={t.settings.agentPanel} description={t.settings.agentPanelDesc}>
            <div className="panel-inner flex items-center justify-between gap-4 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">
                  {agentControlsDisabled ? t.settings.autoStartDisabledTitle : t.settings.autoStartTitle}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {agentControlsDisabled ? t.settings.autoStartDisabledDesc : t.settings.autoStartDesc}
                </div>
              </div>
              <Toggle
                label={t.settings.autoStartTitle}
                checked={!agentControlsDisabled && settings.autoStartAgent}
                onChange={value => update('autoStartAgent', value)}
                disabled={agentControlsDisabled}
              />
            </div>
          </Panel>

          <Panel title={t.settings.aiPanel} description={t.settings.aiPanelDesc}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t.settings.provider}>
                <select
                  className={inputClass}
                  value={settings.aiProvider}
                  onChange={e => update('aiProvider', e.target.value as Settings['aiProvider'])}
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">{t.settings.custom}</option>
                </select>
              </Field>
              <Field label={t.settings.model}>
                <input
                  className={inputClass}
                  value={settings.aiModel}
                  onChange={e => update('aiModel', e.target.value)}
                />
              </Field>
              <Field label={t.settings.baseUrl}>
                <input
                  className={inputClass}
                  value={settings.aiBaseUrl}
                  onChange={e => update('aiBaseUrl', e.target.value)}
                />
              </Field>
            </div>
            <div className="panel-inner flex items-center justify-between gap-4 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">{t.settings.autoAnalyzeTitle}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.settings.autoAnalyzeDesc}</div>
              </div>
              <Toggle label={t.settings.autoAnalyzeTitle} checked={settings.autoAnalyzeFailures} onChange={value => update('autoAnalyzeFailures', value)} />
            </div>
          </Panel>

          <Panel title={t.settings.notifications} description={t.settings.notificationsDesc}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Webhook URL">
                <input
                  className={inputClass}
                  placeholder="https://example.com/webhook"
                  value={settings.webhookUrl}
                  onChange={e => update('webhookUrl', e.target.value)}
                />
              </Field>
              <Field label={t.settings.emailRecipients} hint={t.settings.emailHint}>
                <input
                  className={inputClass}
                  placeholder="qa@example.com, dev@example.com"
                  value={settings.emailRecipients}
                  onChange={e => update('emailRecipients', e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { key: 'notifyOnFailure' as const, title: t.settings.notifyOnFailure, desc: t.settings.notifyOnFailureDesc },
                { key: 'notifyOnRecovery' as const, title: t.settings.notifyOnRecovery, desc: t.settings.notifyOnRecoveryDesc },
              ].map(item => (
                <div key={item.key} className="panel-inner flex items-center justify-between gap-4 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{item.title}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <Toggle label={item.title} checked={settings[item.key]} onChange={value => update(item.key, value)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="settings-side-grid">
          <Panel title={t.settings.languagePanel} description={t.settings.languagePanelDesc}>
            <div className="grid grid-cols-2 gap-2">
              {supportedLocales.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => update('locale', option as Locale)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${settings.locale === option ? 'chip-action is-active' : 'chip-action'}`}
                >
                  {dictionaries[option].localeName}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={t.settings.display} description={t.settings.displayDesc}>
            <div>
              <div className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t.settings.theme}</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  { value: 'meteor' as const, ...t.settings.themes.meteor },
                  { value: 'indigo' as const, ...t.settings.themes.indigo },
                  { value: 'dune' as const, ...t.settings.themes.dune },
                  { value: 'aurora' as const, ...t.settings.themes.aurora },
                  { value: 'parchment' as const, ...t.settings.themes.parchment },
                  { value: 'sky' as const, ...t.settings.themes.sky },
                  { value: 'glacier' as const, ...t.settings.themes.glacier },
                  { value: 'sakura' as const, ...t.settings.themes.sakura },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update('theme', option.value)}
                    className={`rounded-lg px-3 py-2.5 text-left transition-colors ${settings.theme === option.value ? 'chip-action is-active' : 'chip-action'}`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'comfortable' as const, label: t.settings.density.comfortable },
                { value: 'compact' as const, label: t.settings.density.compact },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('density', option.value)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${settings.density === option.value ? 'chip-action is-active' : 'chip-action'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={t.settings.currentConfig} description={t.settings.currentConfigDesc}>
            <dl className="space-y-3 text-sm">
                  {[
                    [t.settings.defaultEnvironment, settings.defaultEnvironment],
                    [t.settings.languagePanel, dictionaries[settings.locale].localeName],
                    [t.settings.taskTimeout, `${settings.taskTimeout}s`],
                [t.settings.maxParallel, String(settings.maxParallelTasks)],
                [t.settings.aiModel, settings.aiModel],
                [t.settings.retention, `${settings.reportRetentionDays} ${t.settings.days}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                  <dd className="font-medium text-white truncate">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
