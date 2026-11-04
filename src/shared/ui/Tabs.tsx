import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

export type Tab<K extends string> = { key: K; label: string }

/** Tablist with a transform-driven active indicator. Keyboard changes move it instantly. */
export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: Tab<K>[]; active: K; onChange: (k: K) => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null)
  const [instant, setInstant] = useState(true)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const el = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [active])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = tabs.findIndex((t) => t.key === active)
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    setInstant(true)
    onChange(next.key)
    listRef.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus()
  }

  return (
    <div role="tablist" className="tabs" ref={listRef} data-instant={instant || undefined} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const selected = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            data-key={t.key}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`tab ${selected ? 'active' : ''}`}
            onClick={(e) => { setInstant(e.detail === 0); onChange(t.key) }}
          >
            {t.label}
          </button>
        )
      })}
      <span
        className="tabs-ind"
        aria-hidden="true"
        style={ind ? { transform: `translateX(${ind.x}px) scaleX(${ind.w})` } : { opacity: 0 }}
      />
    </div>
  )
}
