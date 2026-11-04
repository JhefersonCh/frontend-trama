import { useMemo, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../../shared/api/client'
import type { CaseStatus } from '../../shared/api/diagnostics'
import { Badge, Banner, IconPulse, Loading, PageHeader } from '../../shared/ui'
import '../tickets/tickets.css'
import { CaseVisuals } from '../genui/CaseVisuals'
import '../genui/genui.css'
import { CaseDetailView } from './CaseDetail'
import { ReasoningPanel } from './ReasoningPanel'
import { CASE_STATUS, fmtWhen } from './meta'
import { useCase, useCases } from './useDiagnostics'
import './diagnostics.css'

const FILTERS: { key: CaseStatus | ''; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'escalado', label: 'Escalados' },
  { key: 'sin_actividad', label: 'Sin actividad' },
]

function Detail({ id }: { id: string }) {
  const q = useCase(id)
  if (q.isLoading) return <Loading label="Leyendo caso…" />
  if (q.error) {
    const missing = q.error instanceof ApiError && q.error.status === 404
    return <Banner tone="error">{missing ? 'Ese caso no existe o ya no está disponible.' : errorMessage(q.error)}</Banner>
  }
  return q.data ? <><CaseDetailView d={q.data} /><CaseVisuals sessionId={id} /><div className="dx-reasoning"><ReasoningPanel sessionId={id} /></div></> : null
}

export function DiagnosticsView() {
  const { sessionId } = useParams()
  const [filter, setFilter] = useState<CaseStatus | ''>('')
  const cases = useCases()
  const rows = useMemo(() => (cases.data ?? []).filter((c) => !filter || c.status === filter), [cases.data, filter])

  return (
    <div className="view reveal">
      <PageHeader index="02" kicker="Soporte técnico" title="Diagnóstico">
        Casos en curso con lo que el agente ya sabe, midió y probó, para retomarlos sin repetir preguntas.
      </PageHeader>

      <div className="dx" data-detail={sessionId ? 'open' : 'list'}>
        <aside className="dx-list" aria-label="Casos">
          <div className="filters" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <button key={f.key || 'all'} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.key && <span className={`chip-led chip-led-${f.key}`} aria-hidden="true" />}{f.label}
              </button>
            ))}
          </div>
          {cases.isLoading && <Loading label="Leyendo casos…" />}
          {cases.error && <Banner tone="error">{errorMessage(cases.error)}</Banner>}
          {cases.data && rows.length === 0 && (
            <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />{filter ? 'Sin casos con este estado.' : 'Aún no hay casos. Aparecen cuando alguien describe un problema al agente.'}</div>
          )}
          <ul className="cases">
            {rows.map((c) => {
              const st = CASE_STATUS[c.status] ?? { label: c.status, tone: 'neutral' as const }
              return (
                <li key={c.session_id}>
                  <NavLink to={`/diagnostico/${c.session_id}`} className="case" aria-current={c.session_id === sessionId ? 'true' : undefined}>
                    <span className="case-top">
                      <span className={`case-led case-led-${c.status}`} role="img" aria-label={st.label} />
                      <span className="case-title">{c.title || 'Caso sin título'}</span>
                      <span className="case-when mono">{fmtWhen(c.updated_at)}</span>
                    </span>
                    {c.summary && <span className="case-sum">{c.summary}</span>}
                    <span className="case-foot">
                      {c.ticket_number && <Badge tone="accent">{c.ticket_number}</Badge>}
                      <span className="mono">{c.facts} datos · {c.observations} obs.</span>
                    </span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="dx-pane" aria-live="polite">
          <Link to="/diagnostico" className="dx-back">← Casos</Link>
          {sessionId ? <Detail key={sessionId} id={sessionId} /> : (
            <div className="bay bay-compact ticked">
              <div className="bay-icon"><IconPulse size={26} /></div>
              <p className="bay-tag"><span className="led led-off" aria-hidden="true" />Sin selección</p>
              <h2 className="bay-title">Elija un caso</h2>
              <p className="page-desc">El detalle muestra hechos, mediciones, fuentes y la cronología completa.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
