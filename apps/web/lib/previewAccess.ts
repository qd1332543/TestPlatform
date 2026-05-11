export const previewAccessCookieName = 'meteortest.preview_access'
export const previewAccessTokenHeader = 'x-meteortest-preview-token'

export function getPreviewAccessToken() {
  return process.env.METEORTEST_PREVIEW_ACCESS_TOKEN?.trim() || ''
}

export function isPreviewAccessEnabled() {
  return process.env.METEORTEST_PUBLIC_PREVIEW === '1' && Boolean(getPreviewAccessToken())
}

export function isValidPreviewAccessToken(value?: string | null) {
  const expected = getPreviewAccessToken()
  return Boolean(expected && value && value === expected)
}

export function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
