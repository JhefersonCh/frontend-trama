import { Link } from 'react-router-dom'
import { reportHtmlUrl } from '../../shared/api/reports'
import { LIFECYCLE, lifecycleIndex } from '../diagnostics/meta'
import type { LifecycleState } from '../../shared/api/cases'
import { slaInfo, useNow } from '../tickets/sla'
import { GlyphDoc, GlyphTicket } from './icons'
import { GuFrame } from './parts'
import type { CaseCardProps } from './schema'
import type { GenUiComponentProps } from './types'

const SEGMENTS = 20

/** Segmented LED meter (0..1). Lit segments carry the value; the word label carries the meaning. */
export function CfMeter({ cf, label }: { cf: number; label: string }) {
  const v = Math.max(0, Math.min(1, cf))
  const lit = Math.round(v * SEGMENTS)
  return (
    <div className="cfm" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Number(v.toFixed(2))} aria-valuetext={`${Math.round(v * 100)} %`}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className="cfm-seg" data-on={i < lit || undefined} data-hot={i < lit && i >= SEGMENTS * 0.8 ? '' : undefined} style={{ transitionDelay: `${i * 12}ms` }} />
      ))}
    </div>
  )
}

function MiniLifecycle({ state }: { state: string }) {
  const known = LIFECYCLE.some((l) => l.key === state) || state === 'escalado'
  if (!known) return null
  const cur = lifecycleIndex(state as LifecycleState)
  return (
    <ol className="cc-life" aria-label="Ciclo de vida del caso">
      {LIFECYCLE.map((s, i) => (
        <li key={s.key} data-done={i < cur || undefined} data-current={i === cur || undefined} data-esc={state === 'escalado' && i === cur ? '' : undefined} title={s.label}>
          <span className="sr-only">{s.label}{i === cur ? ' (actual)' : ''}</span>
        </li>
      ))}
    </ol>
  )
}

/** Case status as an instrument panel: lifecycle, leading hypothesis, next step, ticket. */
export function CaseCard({ props, env }: GenUiComponentProps<CaseCardProps>) {
  const now = useNow(30_000)
  const sid = env.sessionId
  const h = props.top_hypothesis
  const t = props.ticket
  const sla = t ? slaInfo(t.sla_due_at, null, now) : null
  const escalated = props.state === 'escalado'

  return (
    <GuFrame
      component="case_card"
      eyebrow="Estado del caso"
      meta={<span className="cc-state" data-state={props.state}><span className="cc-state-led" aria-hidden="true" />{props.state_label}</span>}
      label={`Estado del caso: ${props.state_label}`}
      className={escalated ? 'is-escalated' : ''}
    >
      <MiniLifecycle state={props.state} />

      <div className="cc-grid">
        <div className="cc-cell">
          <p className="gu-kicker">Causa más probable</p>
          {h ? (
            <>
              <p className="cc-hyp">{h.label}</p>
              <CfMeter cf={h.cf} label={`Certeza de ${h.label}`} />
              <p className="cc-conf"><span className="cc-word">{h.confidence_label}</span><span className="mono">CF {h.cf.toFixed(2)}</span></p>
            </>
          ) : <p className="cc-empty">Todavía sin una causa clara.</p>}
        </div>
        <div className="cc-cell">
          <p className="gu-kicker">Próximo paso</p>
          {props.next_step ? <p className="cc-next">{props.next_step}</p> : <p className="cc-empty">Nada pendiente por ahora.</p>}
        </div>
      </div>

      {t && (
        <div className="cc-ticket">
          <GlyphTicket size={18} className="cc-ticket-icon" />
          <div className="cc-ticket-main">
            <span className="cc-ticket-n mono">{t.number}</span>
            <span className="cc-ticket-meta">{t.status_label}{t.technician ? ` · ${t.technician}` : ' · Técnico por asignar'}</span>
          </div>
          {sla && <span className="cc-sla" data-level={sla.level}><span className="cc-sla-led" aria-hidden="true" />{sla.label}</span>}
        </div>
      )}

      <div className="gu-actions">
        {h && env.interactive && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => env.emit('case_action', { what: 'why' })}>¿Por qué?</button>
        )}
        {sid && (
          <Link className="btn btn-ghost btn-sm" to={`/diagnostico/${sid}`} onClick={() => env.emit('case_action', { what: 'open_diagnosis' }, { metric: true })}>
            Ver diagnóstico
          </Link>
        )}
        {t && (
          <Link className="btn btn-ghost btn-sm" to={`/tickets?n=${encodeURIComponent(t.number)}`} onClick={() => env.emit('case_action', { what: 'open_ticket' }, { metric: true })}>
            Ver ticket
          </Link>
        )}
        {sid && (
          <a
            className="btn btn-ghost btn-sm" href={reportHtmlUrl(sid, 'informe')} target="_blank" rel="noopener noreferrer"
            onClick={() => env.emit('case_action', { what: 'report' }, { metric: true })}
          >
            <GlyphDoc size={14} />Informe
          </a>
        )}
      </div>
    </GuFrame>
  )
}
