import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

/**
 * Centered dialog rendered in a portal. Pointer-initiated closes (backdrop, ×) play a short exit;
 * Escape closes instantly (keyboard actions are never animated).
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const animatedClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => closeRef.current(), 140)
  }

  return createPortal(
    <div
      className="modal-backdrop"
      data-closing={closing || undefined}
      onMouseDown={(e) => e.target === e.currentTarget && animatedClose()}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={animatedClose}>
            <IconClose size={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
