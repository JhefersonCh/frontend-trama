import { Link } from 'react-router-dom'
import type { HandoffSummary } from '../../shared/api/tickets'
import { Badge, IconLock } from '../../shared/ui'
import { CfBar } from '../diagnostics/CfBar'
import { fmtFact, sourceMeta } from '../diagnostics/meta'
import { IconClock } from '../technicians/icons'
import { slaInfo, useNow } from './sla'

const TONE = { ok: 'success', warn: 'warning', late: 'danger' } as const

export function SlaChip({ due, start, closed }: { due?: string | null; start?: string | null; closed?: boolean }) {
  const now = useNow()
  if (closed) return <span className="muted">—</span>
  const s = slaInfo(due, start, now)
  if (!s) return <span className="muted">Sin plazo</span>
  return <Badge led tone={TONE[s.level]} icon={<IconClock size={12} />}>{s.label}</Badge>
}

export function ContactLock() {
  return <Badge tone="neutral" icon={<IconLock size={12} />}>Contacto registrado</Badge>
}

const H = ({ children }: { children: string }) => <h5 className="ho-title">{children}</h5>

/** Deterministic handoff summary (§4.2) rendered as sections. */
export function HandoffView({ h, sessionId }: { h: HandoffSummary; sessionId?: string | null }) {
  const convo = h.conversacion || (sessionId ? `/conversacion/${sessionId}` : null)
  const prefs = Object.entries(h.preferencias ?? {}).filter(([, v]) => v)
  return (
    <div className="handoff">
      {h.sintomas && h.sintomas.length > 0 && (
        <div><H>Síntomas</H><ul className="ho-list">{h.sintomas.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {h.hipotesis && h.hipotesis.length > 0 && (
        <div>
          <H>Hipótesis</H>
          <ul className="ho-hyps">
            {h.hipotesis.map((x) => (
              <li key={x.key}>
                <span className="ho-hyp-top"><span>{x.label ?? x.key}</span><b className="mono">{x.cf.toFixed(2)}</b></span>
                <CfBar cf={x.cf} label={`Certeza de ${x.label ?? x.key}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {h.pasos_probados && h.pasos_probados.length > 0 && (
        <div><H>Pasos probados</H><ol className="steps">{h.pasos_probados.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
      )}
      {h.evidencia && h.evidencia.length > 0 && (
        <div>
          <H>Evidencia</H>
          <ul className="ho-ev">
            {h.evidencia.map((e, i) => {
              const src = sourceMeta(e.source)
              return (
                <li key={i}>
                  <span className="mono">{e.key}</span><span>{fmtFact(e.value) ?? '—'}</span>
                  {src && <Badge tone={src.tone}>{src.label}</Badge>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {h.fuentes && h.fuentes.length > 0 && (
        <div><H>Fuentes</H><ul className="ho-list">{h.fuentes.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {prefs.length > 0 && (
        <div>
          <H>Preferencias</H>
          <p className="chips">{prefs.map(([k, v]) => <span key={k} className="tag">{k}: {String(v).replace(/_/g, ' ')}</span>)}</p>
        </div>
      )}
      {convo && <Link className="dx-open" to={convo}>Abrir conversación<span aria-hidden="true"> →</span></Link>}
    </div>
  )
}
