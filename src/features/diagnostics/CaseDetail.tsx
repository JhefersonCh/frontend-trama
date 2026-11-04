import { Link } from 'react-router-dom'
import type { CaseDetail as Detail } from '../../shared/api/diagnostics'
import { Badge } from '../../shared/ui'
import { CaseReports } from '../genui/ReportActions'
import { CASE_STATUS, fmtFact, fmtTime, KIND_LABEL, OBS_SOURCE } from './meta'

function Sec({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="dx-sec">
      <h3 className="dx-sec-title">{title}{count != null && <span className="dx-count">{count}</span>}</h3>
      {children}
    </section>
  )
}
const None = ({ children }: { children: string }) => <p className="dx-none">{children}</p>

export function CaseDetailView({ d }: { d: Detail }) {
  const st = CASE_STATUS[d.status] ?? { label: d.status, tone: 'neutral' as const }
  const { facts, steps_tried, ips, devices } = d.case_state
  return (
    <article className="dx-detail">
      <header className="dx-head">
        <div className="dx-head-top">
          <Badge led tone={st.tone}>{st.label}</Badge>
          {d.audience && <Badge>{d.audience}</Badge>}
          {d.tickets.map((t) => <Link key={t.ticket_number} to="/tickets" className="dx-ticket" title={t.title}>{t.ticket_number}<span>{t.status}</span></Link>)}
        </div>
        <h2>{d.session.title || 'Caso sin título'}</h2>
        <p className="dx-meta mono">Inicio {fmtTime(d.session.started_at)} · Actualizado {fmtTime(d.session.updated_at)}</p>
        <div className="dx-head-actions">
          <Link className="dx-open" to={`/conversacion/${d.session.id}`}>Abrir conversación<span aria-hidden="true"> →</span></Link>
          <CaseReports sessionId={d.session.id} />
        </div>
      </header>

      <Sec title="Estado del caso" count={facts.length}>
        {facts.length === 0 ? <None>El agente aún no registró datos del caso.</None> : (
          <ul className="facts">
            {facts.map((f) => {
              const v = fmtFact(f.value)
              return (
                <li key={f.key} className={v == null ? 'is-pending' : undefined}>
                  <span className="fact-box" aria-hidden="true">{v != null && '✓'}</span>
                  <span className="fact-label">{f.label}</span>
                  <span className="fact-value">{v ?? 'Pendiente'}</span>
                </li>
              )
            })}
          </ul>
        )}
        <div className="dx-two">
          <div><p className="eyebrow">IPs</p>{ips.length ? <p className="chips">{ips.map((ip) => <code key={ip} className="ipchip">{ip}</code>)}</p> : <p className="dx-none">Sin IPs.</p>}</div>
          <div><p className="eyebrow">Equipos</p>{devices ? <p className="dx-text">{devices}</p> : <p className="dx-none">Sin equipos descritos.</p>}</div>
        </div>
      </Sec>

      <Sec title="Pasos ya probados" count={steps_tried.length}>
        {steps_tried.length === 0 ? <None>Todavía no se probó nada.</None> : <ol className="steps">{steps_tried.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      </Sec>

      <Sec title="Observaciones" count={d.observations.length}>
        {d.observations.length === 0 ? <None>Sin mediciones ni observaciones.</None> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Tipo</th><th>Destino</th><th>Resultado</th><th>Origen</th><th>Hora</th></tr></thead>
            <tbody>{d.observations.map((o, i) => {
              const src = OBS_SOURCE[o.source] ?? { label: o.source, tone: 'neutral' as const }
              return (
                <tr key={i}>
                  <td className="cell-strong">{o.observation_type}</td>
                  <td className="col-mono">{o.target ?? '—'}</td>
                  <td className="col-mono">{o.result ?? '—'}{o.unit ? ` ${o.unit}` : ''}</td>
                  <td><Badge tone={src.tone}>{src.label}</Badge></td>
                  <td className="col-mono">{fmtTime(o.collected_at)}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
      </Sec>

      <div className="dx-two dx-two-top">
        <Sec title="Fuentes consultadas" count={d.sources_used.length}>
          {d.sources_used.length === 0 ? <None>No se consultó la base de conocimiento.</None> : (
            <ul className="srcs">{d.sources_used.map((s, i) => (
              <li key={i}>
                <span className="src-title">{s.title}{s.section && <span className="muted"> · {s.section}</span>}</span>
                <span className="src-meta">
                  {s.is_synthetic && <Badge tone="warning">Sintético</Badge>}
                  <span className="mono">{s.times}×</span>
                  <span className="mono" title="Mejor puntaje">{s.best_score != null ? s.best_score.toFixed(2) : '—'}</span>
                </span>
              </li>
            ))}</ul>
          )}
        </Sec>
        <Sec title="Herramientas usadas" count={d.tools.length}>
          {d.tools.length === 0 ? <None>Sin llamadas a herramientas.</None> : (
            <ul className="srcs">{d.tools.map((t, i) => (
              <li key={i}>
                <span className="src-title"><b className="mono">{t.name}</b><span className="muted"> {t.summary}</span></span>
                <span className="src-meta"><Badge led tone={t.ok ? 'success' : 'danger'}>{t.ok ? 'OK' : 'Error'}</Badge></span>
              </li>
            ))}</ul>
          )}
        </Sec>
      </div>

      <Sec title="Línea de tiempo" count={d.timeline.length}>
        {d.timeline.length === 0 ? <None>Sin eventos.</None> : (
          <ol className="timeline dx-tl">
            {d.timeline.map((e, i) => (
              <li key={i} className={`tl-item tl-${e.kind}`}>
                <span className="tl-node" aria-hidden="true" />
                <div className="tl-head"><span className="tl-type"><span className="tl-kind mono">{KIND_LABEL[e.kind] ?? e.kind}</span>{e.summary}</span><span className="tl-time">{fmtTime(e.at)}</span></div>
                {e.detail && <details className="tl-detail"><summary>Ver detalle</summary><pre>{e.detail}</pre></details>}
              </li>
            ))}
          </ol>
        )}
      </Sec>
    </article>
  )
}
