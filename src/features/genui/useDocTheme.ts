import { useEffect, useState } from 'react'

export type DocTheme = 'dark' | 'light'
const read = (): DocTheme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

/** Follows the app theme (ThemeToggle writes `data-theme` on <html>). */
export function useDocTheme(): DocTheme {
  const [theme, setTheme] = useState<DocTheme>(read)
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver(() => setTheme(read()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return theme
}

export function useReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)'
  const [reduce, setReduce] = useState(() => window.matchMedia?.(q).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(q)
    if (!mq) return
    const on = () => setReduce(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}
