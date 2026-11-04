import type { ReactNode } from 'react'
import type { NodeStatus } from './schema'

/** Instrument frame shared by every generative component: mono eyebrow, optional meta, body. */
export function GuFrame({ component, eyebrow, meta, label, className = '', children }: {
  component: string; eyebrow: ReactNode; meta?: ReactNode; label: string; className?: string; children: ReactNode
}) {
  return (
    <section className={`gu gu-${component} ${className}`} aria-label={label}>
      <header className="gu-head">
        <span className="gu-eyebrow"><span className="gu-tick" aria-hidden="true" />{eyebrow}</span>
        {meta != null && <span className="gu-meta">{meta}</span>}
      </header>
      {children}
    </section>
  )
}

export const STATUS_LABEL: Record<NodeStatus, string> = { ok: 'Funciona', fail: 'Falla', warn: 'Revisar', unknown: 'Sin datos' }

/** Status LED: color is never alone — callers always print STATUS_LABEL beside it. */
export const StatusLed = ({ status }: { status: NodeStatus }) => <span className="gu-led" data-status={status} aria-hidden="true" />

export function fmtAt(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
