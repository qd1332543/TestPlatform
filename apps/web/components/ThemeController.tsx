'use client'

import { useEffect } from 'react'

const settingsKey = 'meteortest.settings.v1'
const settingsUpdatedEvent = 'meteortest-settings-updated'
const defaultTheme = 'meteor'
const validThemes = new Set(['meteor', 'indigo', 'dune', 'aurora', 'parchment', 'sky', 'glacier', 'sakura'])

function resolveTheme() {
  const raw = window.localStorage.getItem(settingsKey)
  if (!raw) return defaultTheme
  try {
    const settings = JSON.parse(raw) as { theme?: string }
    return settings.theme && validThemes.has(settings.theme) ? settings.theme : defaultTheme
  } catch {
    return defaultTheme
  }
}

function applyTheme() {
  const theme = resolveTheme()
  const root = document.documentElement
  if (theme === defaultTheme) {
    root.removeAttribute('data-theme')
  } else {
    root.dataset.theme = theme
  }
}

export default function ThemeController() {
  useEffect(() => {
    applyTheme()
    window.addEventListener('storage', applyTheme)
    window.addEventListener(settingsUpdatedEvent, applyTheme)
    return () => {
      window.removeEventListener('storage', applyTheme)
      window.removeEventListener(settingsUpdatedEvent, applyTheme)
    }
  }, [])

  return null
}
