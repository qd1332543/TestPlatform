import { cookies } from 'next/headers'
import { dictionaries, localeCookieName, normalizeLocale, type Dictionary, type Locale } from '@/content/i18n'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return normalizeLocale(store.get(localeCookieName)?.value)
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]
}

export function getDictionaryForLocale(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export function formatDateTime(value: string | null | undefined, locale: Locale) {
  return value ? new Date(value).toLocaleString(locale) : '-'
}

