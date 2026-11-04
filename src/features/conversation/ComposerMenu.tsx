import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconMore } from './glyphs'

/** "⋯" popover anchored to the composer's bottom-left. Pointer opens animate; Escape closes instantly. */
export function ComposerMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    wrap.current?.querySelector<HTMLElement>('[data-menu-first]')?.focus()
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const close = () => { setOpen(false); btn.current?.focus() }

  return (
    <div
      className="cmenu"
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) { e.stopPropagation(); close() }
      }}
    >
      <button
        ref={btn}
        type="button"
        className="cmp-btn cmp-ghost"
        aria-label="Más opciones"
        title="Más opciones"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <IconMore size={18} />
      </button>
      {open && (
        <div className="cmenu-pop" id={id} role="group" aria-label="Opciones del chat">
          {children(close)}
        </div>
      )}
    </div>
  )
}
