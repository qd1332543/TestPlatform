import { NextRequest, NextResponse } from 'next/server'
import {
  isPreviewAccessEnabled,
  isValidPreviewAccessToken,
  previewAccessCookieName,
  previewAccessTokenHeader,
} from '@/lib/previewAccess'

const publicPaths = new Set(['/preview-access', '/api/preview-access', '/favicon.ico'])

function hasPreviewAccess(request: NextRequest) {
  const cookieToken = request.cookies.get(previewAccessCookieName)?.value
  const headerToken = request.headers.get(previewAccessTokenHeader)
  return isValidPreviewAccessToken(cookieToken) || isValidPreviewAccessToken(headerToken)
}

export function proxy(request: NextRequest) {
  if (!isPreviewAccessEnabled()) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  if (publicPaths.has(pathname) || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  if (hasPreviewAccess(request)) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Preview access required' }, { status: 401 })
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/preview-access'
  redirectUrl.search = ''
  redirectUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(redirectUrl)
}

export const config = {
  matcher: ['/((?!.*\\..*).*)', '/api/:path*', '/favicon.ico'],
}
