import { useEffect, useRef, useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/client'
import type { AgentCase, AgentHypothesis } from '../../shared/api/cases'
import { Badge, Banner, Button, Loading } from '../../shared/ui'
import { useSettings } from '../config/settings/useSettings'
import { fmtFact, fmtTime, HYP_STATUS, LIFECYCLE, lifecycleIndex, PHASE_LABEL, sourceMeta } from './meta'
import { CfBar, parseThresholds, type CfThresholds } from './CfBar'
import { useAgentCase, useExplain } from './useAgentCase'
import './reasoning.css'

function Why({ sessionId, h }: { sessionId: string; h: AgentHypothesis }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const q = useExplain(sessionId, open ? h.key : null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  const e = q.data
  return (
    <div className="why-wrap" ref={ref}>
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>¿Por qué?</Button>
      {open && (
        <div className="why-pop" role="dialog" aria-label={`Por qué: ${h.label ?? h.key}`}>
          <h5>Explicación</h5>
          {q.isLoading && <Loading label="Buscando la explicación…" />}
          {q.error && <p>{q.error instanceof ApiError && q.error.status === 404 ? 'No hay explicación disponible para esta hipótesis.' : errorMessage(q.error)}</p>}
          {e && (
            <>
              <p>{e.text ?? 'Sin texto de explicación.'}</p>
              {e.rules && e.rules.length > 0 && (
                <ul>{e.rules.map((r) => <li key={r.id}><b className="mono">{r.id}</b>{r.text ? ` · ${r.text}` : ''}</li>)}</ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Hypotheses({ sessionId, items, th }: { sessionId: string; items: AgentHypothesis[]; th: CfThresholds }) {
  if (items.length === 0) return <p className="dx-none">El agente todavía no formuló hipótesis.</p>
  const sorted = [...items].sort((a, b) => b.cf - a.cf)
  return (
    <ul className="hyps">
      {sorted.map((h) => {
        const st = HYP_STATUS[h.status] ?? HYP_STATUS.viva
        return (
          <li key={h.key} className={`hyp is-${h.status}`}>
            <div className="hyp-top">
              <span className="hyp-label">{h.label ?? h.key}</span>
              <Badge tone={st.tone} led={h.status === 'aceptada'}>{st.label}</Badge>
              <span className="hyp-cf" aria-hidden="true">{h.cf >= 0 ? '+' : ''}{h.cf.toFixed(2)}</span>
              <Why sessionId={sessionId} h={h} />
            </div>
            <CfBar cf={h.cf} label={`Certeza de ${h.label ?? h.key}`} status={h.status} thresholds={th} />
            <div className="hyp-scale" aria-hidden="true"><span>−1</span><span>0</span><span>+1</span></div>
          </li>
        )
      })}
    </ul>
  )
}

function Stepper({ state }: { state: AgentCase['state'] }) {
  const cur = lifecycleIndex(state)
  return (
    <ol className="stepper" aria-label="Ciclo de vida del caso">
      {LIFECYCLE.map((s, i) => (
        <li
          key={s.key}
          className={`step${i < cur ? ' is-done' : ''}${i === cur ? ' is-current' : ''}${state === 'escalado' && i === 5 ? ' is-escalado' : ''}`}
          aria-current={i === cur ? 'step' : undefined}
        >
          {i === 5 ? (state === 'escalado' ? 'Escalado' : state === 'resuelto' ? 'Resuelto' : s.label) : s.label}
        </li>
      ))}
    </ol>
  )
}

export function ReasoningPanel({ sessionId }: { sessionId: string }) {
  const q = useAgentCase(sessionId)
  const settings = useSettings()
  const th = parseThresholds(settings.data?.cf_thresholds)

  if (q.isLoading) return <Loading label="Leyendo el razonamiento del agente…" />
  if (q.error) {
    const missing = q.error instanceof ApiError && q.error.status === 404
    return missing
      ? <Banner tone="info">Este caso todavía no tiene razonamiento del agente registrado.</Banner>
      : <Banner tone="error">{errorMessage(q.error)}</Banner>
  }
  const c = q.data
  if (!c) return null
  const trace = [...(c.trace ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <section className="rz" aria-label="Razonamiento del agente">
      <div className="rz-head">
        <h3>Razonamiento del agente</h3>
        <span className="rz-sub">
          {c.verified && <Badge tone="success" led>Resolución verificada</Badge>}
          {c.goal ? <> Objetivo: {c.goal.replace(/_/g, ' ')}</> : null}
        </span>
      </div>

      <Stepper state={c.state} />

      <div>
        <h4 className="dx-sec-title">Hipótesis<span className="dx-count">{c.hypotheses.length}</span></h4>
        <Hypotheses sessionId={sessionId} items={c.hypotheses} th={th} />
      </div>

      <div>
        <h4 className="dx-sec-title">Hechos<span className="dx-count">{c.facts.length}</span></h4>
        {c.facts.length === 0 ? <p className="dx-none">Sin hechos registrados.</p> : (
          <ul className="rz-facts">
            {c.facts.map((f, i) => {
              const src = sourceMeta(f.source)
              return (
                <li key={`${f.key}-${i}`}>
                  <span className="rz-fact-key">{f.label ?? f.key}</span>
                  <span className="rz-fact-val">{fmtFact(f.value) ?? '—'}</span>
                  <span className="rz-fact-meta">
                    {src && <Badge tone={src.tone}>{src.label}</Badge>}
                    {f.certainty != null && <span className="mono" title="Certeza del hecho">{Math.round(f.certainty * 100)} %</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <h4 className="dx-sec-title">Traza de decisiones<span className="dx-count">{trace.length}</span></h4>
        {trace.length === 0 ? <p className="dx-none">Sin decisiones registradas.</p> : (
          <ol className="trace">
            {trace.map((t, i) => (
              <li key={t.id ?? i}>
                <span className={`phase phase-${t.phase}`}>{PHASE_LABEL[t.phase] ?? t.phase}</span>
                <div className="trace-main">
                  {t.action && <span className="trace-action">{t.action}</span>}
                  {t.reason && <span className="trace-reason">{t.reason}</span>}
                  {t.rules_fired && t.rules_fired.length > 0 && (
                    <span className="trace-rules">{t.rules_fired.map((r) => <code key={r} className="ipchip">{r}</code>)}</span>
                  )}
                </div>
                <time className="trace-time">{fmtTime(t.created_at)}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
