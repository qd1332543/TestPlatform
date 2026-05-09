'use client'

import { useMemo, useState } from 'react'
import { defaultLocale, dictionaries, localeCookieName, normalizeLocale, type Locale } from '@/content/i18n'

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${localeCookieName}=`))
  return normalizeLocale(match?.split('=')[1])
}

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; SameSite=Lax`
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => readCookieLocale())

  const dictionary = useMemo(() => dictionaries[locale], [locale])

  function updateLocale(nextLocale: Locale) {
    setLocaleCookie(nextLocale)
    setLocale(nextLocale)
    window.location.reload()
  }

  return { locale, dictionary, setLocale: updateLocale }
}
