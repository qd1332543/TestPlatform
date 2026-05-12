import { normalizeLocale, type Locale } from '@/content/i18n'

export const preferenceStorageKey = 'meteortest.settings.v1'
export const settingsUpdatedEvent = 'meteortest-settings-updated'

export const themes = ['meteor', 'indigo', 'dune', 'aurora', 'parchment', 'sky', 'glacier', 'sakura'] as const
export type Theme = typeof themes[number]
export type Density = 'comfortable' | 'compact'
export type Environment = 'dev' | 'staging' | 'prod'

export type AccountPreferences = {
  platformName: string
  locale: Locale
  theme: Theme
  density: Density
  defaultEnvironment: Environment
  aiModel: string
  aiBaseUrl: string
  autoAnalyzeFailures: boolean
}

export type PreferenceRow = {
  platform_name?: string | null
  locale?: string | null
  theme?: string | null
  density?: string | null
  default_environment?: string | null
  ai_model?: string | null
  ai_base_url?: string | null
  auto_analyze_failures?: boolean | null
}

export const defaultAccountPreferences: AccountPreferences = {
  platformName: '星流测试台',
  locale: 'zh-CN',
  theme: 'meteor',
  density: 'comfortable',
  defaultEnvironment: 'dev',
  aiModel: 'deepseek-v4-pro',
  aiBaseUrl: 'https://api.deepseek.com',
  autoAnalyzeFailures: true,
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme)
}

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact'
}

function isEnvironment(value: unknown): value is Environment {
  return value === 'dev' || value === 'staging' || value === 'prod'
}

export function normalizeAccountPreferences(value: Partial<AccountPreferences> = {}): AccountPreferences {
  return {
    platformName: value.platformName?.trim() || defaultAccountPreferences.platformName,
    locale: normalizeLocale(value.locale),
    theme: isTheme(value.theme) ? value.theme : defaultAccountPreferences.theme,
    density: isDensity(value.density) ? value.density : defaultAccountPreferences.density,
    defaultEnvironment: isEnvironment(value.defaultEnvironment) ? value.defaultEnvironment : defaultAccountPreferences.defaultEnvironment,
    aiModel: value.aiModel?.trim() || defaultAccountPreferences.aiModel,
    aiBaseUrl: value.aiBaseUrl?.trim() || defaultAccountPreferences.aiBaseUrl,
    autoAnalyzeFailures: typeof value.autoAnalyzeFailures === 'boolean'
      ? value.autoAnalyzeFailures
      : defaultAccountPreferences.autoAnalyzeFailures,
  }
}

export function preferencesFromRow(row: PreferenceRow | null | undefined) {
  return normalizeAccountPreferences({
    locale: normalizeLocale(row?.locale),
    platformName: row?.platform_name ?? undefined,
    theme: row?.theme as Theme | undefined,
    density: row?.density as Density | undefined,
    defaultEnvironment: row?.default_environment as Environment | undefined,
    aiModel: row?.ai_model ?? undefined,
    aiBaseUrl: row?.ai_base_url ?? undefined,
    autoAnalyzeFailures: row?.auto_analyze_failures ?? undefined,
  })
}

export function preferencesToRow(userId: string, preferences: AccountPreferences) {
  return {
    user_id: userId,
    platform_name: preferences.platformName,
    locale: preferences.locale,
    theme: preferences.theme,
    density: preferences.density,
    default_environment: preferences.defaultEnvironment,
    ai_model: preferences.aiModel,
    ai_base_url: preferences.aiBaseUrl,
    auto_analyze_failures: preferences.autoAnalyzeFailures,
    updated_at: new Date().toISOString(),
  }
}
