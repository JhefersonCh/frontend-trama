import type { ComponentType, SVGProps } from 'react'
import { GlyphBell, GlyphChip, GlyphFact, GlyphNote, GlyphStep, GlyphTicket } from './icons'
import { fmtAt, GuFrame } from './parts'
import type { TimelineKind, TimelineItem } from './schema'
import type { GenUiComponentProps } from './types'

const KIND: Record<TimelineKind, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }> }> = {
  fact: { label: 'Dato', Icon: GlyphFact },
  step: { label: 'Paso', Icon: GlyphStep },
  ticket: { label: 'Ticket', Icon: GlyphTicket },
  note: { label: 'Nota', Icon: GlyphNote },
  followup: { label: 'Seguimiento', Icon: GlyphBell },
  system: { label: 'Sistema', Icon: GlyphChip },
}

export function Timeline({ props }: GenUiComponentProps<{ items: TimelineItem[] }>) {
  return (
    <GuFrame component="timeline" eyebrow="Línea de tiempo" meta={<span className="mono">{props.items.length}</span>} label="Línea de tiempo del caso">
      <ol className="tlg">
        {props.items.map((it, i) => {
          const k = KIND[it.kind]
          return (
            <li key={i} className="tlg-item" data-kind={it.kind} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
              <span className="tlg-node" aria-hidden="true"><k.Icon size={14} /></span>
              <div className="tlg-body">
                <p className="tlg-head">
                  <span className="tlg-kind">{k.label}</span>
                  {it.at && <time className="tlg-time" dateTime={it.at}>{fmtAt(it.at)}</time>}
                </p>
                <p className="tlg-title">{it.title}</p>
                {it.detail && <p className="tlg-detail">{it.detail}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </GuFrame>
  )
}
