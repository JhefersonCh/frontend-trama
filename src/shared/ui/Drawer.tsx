import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'
import './extras.css'

/** Right-hand detail panel. Pointer closes slide out; Escape closes instantly (keyboard is never animated). */
export function Drawer({ label, eyebrow, title, onClose, children }: {
  label: string; eyebrow?: ReactNode; title: ReactNode; onClose: () => void; children: ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const animatedClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => closeRef.current(), 180)
  }

  return createPortal(
    <div className="drawer-backdrop" data-closing={closing || undefined} onMouseDown={(e) => e.target === e.currentTarget && animatedClose()}>
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <header className="drawer-head">
          <div className="drawer-titles">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={animatedClose}><IconClose size={16} /></button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
