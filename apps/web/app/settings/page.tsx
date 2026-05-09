'use client'

import { useEffect, useMemo, useState } from 'react'

type Settings = {
  platformName: string
  theme: 'meteor' | 'indigo' | 'forest' | 'aurora'
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
  if (!['meteor', 'indigo', 'forest', 'aurora'].includes(settings.theme)) {
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
      className="relative h-7 w-12 rounded-full transition-colors shrink-0"
      style={{ background: checked ? 'var(--accent)' : 'var(--surface-soft)', border: '1px solid var(--border)' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full transition-transform"
        style={{ left: 4, transform: checked ? 'translateX(20px)' : 'translateX(0)', background: checked ? '#06100C' : 'var(--text-muted)' }}
      />
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
    setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
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
          <h1 className="text-2xl font-bold text-white">设置</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>配置平台默认行为、AI 助手和通知策略</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="secondary-action px-4 py-2 rounded-lg text-sm transition-colors"
          >
            导出配置
          </button>
          <button
            type="button"
            onClick={reset}
            className="secondary-action px-4 py-2 rounded-lg text-sm transition-colors"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!loaded || !dirty}
            className="primary-action px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存设置
          </button>
        </div>
      </div>

      {(dirty || savedAt) && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: dirty ? '#2A1A0A' : '#0D2818',
            border: `1px solid ${dirty ? '#7C2D12' : '#14532D'}`,
            color: dirty ? '#F97316' : '#22C55E',
          }}
        >
          {dirty ? '有未保存的设置变更' : `设置已保存 ${savedAt}`}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="平台默认值" description="用于新任务和报告归档的默认参数。">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="平台名称">
                <input
                  className={inputClass}
                  value={settings.platformName}
                  onChange={e => update('platformName', e.target.value)}
                />
              </Field>
              <Field label="默认环境">
                <select
                  className={inputClass}
                  value={settings.defaultEnvironment}
                  onChange={e => update('defaultEnvironment', e.target.value as Settings['defaultEnvironment'])}
                >
                  {['dev', 'staging', 'prod'].map(env => <option key={env} value={env}>{env}</option>)}
                </select>
              </Field>
              <Field label="任务超时" hint="单位：秒">
                <input
                  type="number"
                  min={60}
                  step={60}
                  className={inputClass}
                  value={settings.taskTimeout}
                  onChange={e => update('taskTimeout', Number(e.target.value))}
                />
              </Field>
              <Field label="并发任务上限">
                <input
                  type="number"
                  min={1}
                  max={32}
                  className={inputClass}
                  value={settings.maxParallelTasks}
                  onChange={e => update('maxParallelTasks', Number(e.target.value))}
                />
              </Field>
              <Field label="失败重试次数">
                <input
                  type="number"
                  min={0}
                  max={5}
                  className={inputClass}
                  value={settings.retryCount}
                  onChange={e => update('retryCount', Number(e.target.value))}
                />
              </Field>
              <Field label="报告保留天数">
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

          <Panel title="Local Agent" description="配置本机执行器的启动策略。">
            <div className="panel-inner flex items-center justify-between gap-4 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">打开执行器页自动启动</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>进入执行器页面时自动拉起 Local Agent，确保新任务能被及时领取。</div>
              </div>
              <Toggle label="打开执行器页自动启动 Local Agent" checked={settings.autoStartAgent} onChange={value => update('autoStartAgent', value)} />
            </div>
          </Panel>

          <Panel title="AI 助手" description="配置助手模型、接口地址和失败分析策略。">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="服务商">
                <select
                  className={inputClass}
                  value={settings.aiProvider}
                  onChange={e => update('aiProvider', e.target.value as Settings['aiProvider'])}
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">自定义</option>
                </select>
              </Field>
              <Field label="模型">
                <input
                  className={inputClass}
                  value={settings.aiModel}
                  onChange={e => update('aiModel', e.target.value)}
                />
              </Field>
              <Field label="接口地址">
                <input
                  className={inputClass}
                  value={settings.aiBaseUrl}
                  onChange={e => update('aiBaseUrl', e.target.value)}
                />
              </Field>
            </div>
            <div className="panel-inner flex items-center justify-between gap-4 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">失败任务自动分析</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>任务失败后允许 AI 自动生成摘要和排查建议。</div>
              </div>
              <Toggle label="失败任务自动分析" checked={settings.autoAnalyzeFailures} onChange={value => update('autoAnalyzeFailures', value)} />
            </div>
          </Panel>

          <Panel title="通知" description="配置测试失败和恢复时的通知渠道。">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Webhook URL">
                <input
                  className={inputClass}
                  placeholder="https://example.com/webhook"
                  value={settings.webhookUrl}
                  onChange={e => update('webhookUrl', e.target.value)}
                />
              </Field>
              <Field label="邮件收件人" hint="多个地址用英文逗号分隔">
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
                { key: 'notifyOnFailure' as const, title: '失败通知', desc: '任务失败或超时时发送通知。' },
                { key: 'notifyOnRecovery' as const, title: '恢复通知', desc: '失败后首次成功时发送恢复通知。' },
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
          <Panel title="显示偏好" description="控制页面信息密度和控制台主题。">
            <div>
              <div className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>主题</div>
              <div className="grid gap-2">
                {[
                  { value: 'meteor' as const, label: '星流墨色', desc: '默认主题，黑底、薄荷绿和金色点缀。' },
                  { value: 'indigo' as const, label: '靛蓝瓷', desc: '更冷静的蓝紫控制台。' },
                  { value: 'forest' as const, label: '森林墨', desc: '低饱和绿色，适合长时间查看。' },
                  { value: 'aurora' as const, label: '极光终端', desc: '更强科技感，但仍保留操作台克制感。' },
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
                { value: 'comfortable' as const, label: '舒适' },
                { value: 'compact' as const, label: '紧凑' },
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

          <Panel title="当前配置" description="保存后会写入浏览器本地存储。">
            <dl className="space-y-3 text-sm">
              {[
                ['默认环境', settings.defaultEnvironment],
                ['任务超时', `${settings.taskTimeout}s`],
                ['并发上限', String(settings.maxParallelTasks)],
                ['AI 模型', settings.aiModel],
                ['报告保留', `${settings.reportRetentionDays} 天`],
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
