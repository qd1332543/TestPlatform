export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return uuidPattern.test(value)
}

export function shortInternalRef(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : '-'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function taskRef(row: { display_id?: unknown; id?: unknown; parameters?: unknown }) {
  const parameters = isRecord(row.parameters) ? row.parameters : null
  const displayName = typeof parameters?.display_name === 'string' ? parameters.display_name : ''
  const displayId = typeof row.display_id === 'string' ? row.display_id : ''
  return displayId || displayName
}

export function buildRef(row: { display_id?: unknown; id?: unknown; platform?: unknown; version?: unknown; build_number?: unknown }) {
  if (typeof row.display_id === 'string' && row.display_id) return row.display_id
  const platform = typeof row.platform === 'string' ? row.platform.toUpperCase() : ''
  const version = typeof row.version === 'string' ? row.version : ''
  const buildNumber = typeof row.build_number === 'string' ? row.build_number : ''
  const parts = [platform, version, buildNumber].filter(Boolean)
  return parts.length ? parts.join('-') : ''
}
