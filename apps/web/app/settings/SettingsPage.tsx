'use client'

import { useEffect, useMemo, useState } from 'react'
import { dictionaries, supportedLocales, type Locale } from '@/content/i18n'
import { useLocale } from '@/lib/useLocale'

type Settings = {
  platformName: string
  theme: 'meteor' | 'indigo' | 'dune' | 'aurora' | 'parchment' | 'sky' | 'glacier' | 'sakura'
  defaultEnvironment: 'dev' | 'staging' | 'prod'
  taskTimeout: number
  maxParallelTasks: number
  retryCount: number
  reportRetentionDays: number
  autoStartAgent: boolean
  aiProvider: 'deepseek' | 'openai' | 'custom'
  aiModel: string
  aiBaseUrl: string
  autoAnalyzeFailures: boolean
  notifyOnFailure: boolean
  notifyOnRecovery: boolean
  webhookUrl: string
  emailRecipients: string
  density: 'comfortable' | 'compact'
}

const storageKey = 'meteortest.settings.v1'
const settingsUpdatedEvent = 'meteortest-settings-updated'

const defaultSettings: Settings = {
  platformName: '星流测试台',
  theme: 'meteor',
  defaultEnvironment: 'dev',
  taskTimeout: 1800,
  maxParallelTasks: 4,
  retryCount: 1,
  reportRetentionDays: 30,
  autoStartAgent: true,
  aiProvider: 'deepseek',
  aiModel: 'deepseek-v4-pro',
  aiBaseUrl: 'https://api.deepseek.com',
  autoAnalyzeFailures: true,
  notifyOnFailure: true,
  notifyOnRecovery: false,
  webhookUrl: '',
  emailRecipients: '',
  density: 'comfortable',
}

function normalizeSettings(value: Partial<Settings>): Settings {
  const settings = { ...defaultSettings, ...value }
  if (!['meteor', 'indigo', 'dune', 'aurora', 'parchment', 'sky', 'glacier', 'sakura'].includes(settings.theme)) {
    settings.theme = defaultSettings.theme
  }
  if (!settings.platformName?.trim()) {
    settings.platformName = defaultSettings.platformName
  }
  if (!settings.aiModel?.trim() || settings.aiModel === 'deepseek-chat') {
    settings.aiModel = defaultSettings.aiModel
  }
  return settings
}

const inputClass = 'field-input px-3 py-2.5 text-sm'

function applyTheme(theme: Settings['theme']) {
  if (theme === 'meteor') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.dataset.theme = theme
  }
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="toggle-control"
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
  const { locale, dictionary: t, setLocale } = useLocale()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [savedSettings, setSavedSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey)
    if (raw) {
      try {
        const parsed = normalizeSettings(JSON.parse(raw) as Partial<Settings>)
        window.localStorage.setItem(storageKey, JSON.stringify(parsed))
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

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  )

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'theme') applyTheme(value as Settings['theme'])
    setSavedAt(null)
  }

  function save() {
    const normalized = normalizeSettings(settings)
    window.localStorage.setItem(storageKey, JSON.stringify(normalized))
    applyTheme(normalized.theme)
    window.dispatchEvent(new Event(settingsUpdatedEvent))
    setSettings(normalized)
    setSavedSettings(normalized)
    setSavedAt(new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
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
    <div className="space-y-6 w-full max-w-6xl">
      <div className="sticky -top-6 z-20 -mx-6 flex flex-col gap-4 px-6 py-4 backdrop-blur md:flex-row md:items-end md:justify-between"
        style={{ background: 'color-mix(in srgb, var(--bg-base) 92%, transparent)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold text-white">{t.settings.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.settings.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
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
                <div className="text-sm font-medium text-white">{t.settings.autoStartTitle}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.settings.autoStartDesc}</div>
              </div>
              <Toggle label={t.settings.autoStartTitle} checked={settings.autoStartAgent} onChange={value => update('autoStartAgent', value)} />
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

        <aside className="space-y-5">
          <Panel title={t.settings.languagePanel} description={t.settings.languagePanelDesc}>
            <div className="grid grid-cols-2 gap-2">
              {supportedLocales.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocale(option as Locale)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${locale === option ? 'chip-action is-active' : 'chip-action'}`}
                >
                  {dictionaries[option].localeName}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={t.settings.display} description={t.settings.displayDesc}>
            <div>
              <div className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t.settings.theme}</div>
              <div className="grid gap-2">
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
