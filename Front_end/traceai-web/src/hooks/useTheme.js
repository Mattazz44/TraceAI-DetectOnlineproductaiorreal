import { useCallback, useEffect, useState } from 'react'

const THEME_KEY = 'traceai:theme'

function resolveInitialTheme() {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.dataset.theme
    if (attr === 'dark' || attr === 'light') return attr
  }
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* localStorage blocked */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.getElementById('meta-theme-color')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0E1210' : '#F6F7F5')
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore quota errors */
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
