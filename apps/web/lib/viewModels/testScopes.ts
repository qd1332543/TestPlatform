import type { Locale } from '@/content/i18n'

export type TestScopeLike = {
  name?: string | null
  suite_key?: string | null
  suiteKey?: string | null
  type?: string | null
}

export type TestScopeRelation = TestScopeLike | TestScopeLike[] | null | undefined

export function firstTestScope(value: TestScopeRelation): TestScopeLike | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function testScopeDisplayName(value: TestScopeRelation, locale: Locale) {
  const scope = firstTestScope(value)
  const name = scope?.name?.trim() || ''
  const key = (scope?.suite_key ?? scope?.suiteKey ?? '').trim()
  const source = `${name} ${key} ${scope?.type ?? ''}`.toLowerCase()
  if (!name && !key) return ''
  if (locale !== 'zh-CN') return name || key

  const isApi = /\bapi\b|接口/.test(source)
  const isUi = /\bui\b|ios|android|appium|web|界面/.test(source)
  const prefix = isApi ? 'API ' : isUi ? 'UI ' : ''

  if (/smoke|冒烟/.test(source)) return `${prefix}冒烟测试`
  if (/full|regression|all|全量|回归/.test(source)) return `${prefix}全量回归`
  if (/performance|perf|性能/.test(source)) return '性能测试'
  if (isApi) return 'API 测试'
  if (isUi) return 'UI 测试'
  return name || key
}
