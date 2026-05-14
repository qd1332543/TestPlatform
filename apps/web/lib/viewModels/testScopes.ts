import type { Dictionary } from '@/content/i18n'

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

type TestScopeLabels = Dictionary['common']['testScopes']

export function testScopeDisplayName(value: TestScopeRelation, labels: TestScopeLabels) {
  const scope = firstTestScope(value)
  const name = scope?.name?.trim() || ''
  const key = (scope?.suite_key ?? scope?.suiteKey ?? '').trim()
  const source = `${name} ${key} ${scope?.type ?? ''}`.toLowerCase()
  if (!name && !key) return ''

  const isApi = /\bapi\b|接口/.test(source)
  const isUi = /\bui\b|ios|android|appium|web|界面/.test(source)

  if (/smoke|冒烟/.test(source)) {
    if (isApi) return labels.apiSmoke
    if (isUi) return labels.uiSmoke
  }
  if (/full|regression|all|全量|回归/.test(source)) {
    if (isApi) return labels.apiRegression
    if (isUi) return labels.uiRegression
  }
  if (/performance|perf|性能/.test(source)) return labels.performance
  if (isApi) return labels.api
  if (isUi) return labels.ui
  return name || key
}
