import { NextRequest, NextResponse } from 'next/server'
import {
  isPreviewAccessEnabled,
  isValidPreviewAccessToken,
  previewAccessCookieName,
  sanitizeNextPath,
} from '@/lib/previewAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const token = formData.get('accessToken')
  const nextPath = sanitizeNextPath(formData.get('next')?.toString())

  if (!isPreviewAccessEnabled()) {
    return NextResponse.redirect(new URL(nextPath, request.url), 303)
  }

  if (typeof token !== 'string' || !isValidPreviewAccessToken(token.trim())) {
    const redirectUrl = new URL('/preview-access', request.url)
    redirectUrl.searchParams.set('error', '1')
    redirectUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(redirectUrl, 303)
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303)
  response.cookies.set(previewAccessCookieName, token.trim(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return response
}
