import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from '../shared/ui/icons'

export type Theme = 'dark' | 'light'
const KEY = 'trama-theme'

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Stored choice wins; otherwise follow the OS, defaulting to dark. index.html applies the same rule before paint. */
function initialTheme(): Theme {
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'light' || fromDom === 'dark') return fromDom
  const s = stored()
  if (s) return s
  try {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  } catch { /* matchMedia unavailable */ }
  return 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* storage blocked */ }
    setTheme(next)
  }

  const label = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <IconMoon className="tt-icon tt-moon" />
      <IconSun className="tt-icon tt-sun" />
    </button>
  )
}
