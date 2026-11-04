import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../shared/api/client'
import type { MetricsRange, MetricsSummary } from '../../shared/api/metrics'
import { useQuery } from '@tanstack/react-query'
import { listCases } from '../../shared/api/diagnostics'
import { Badge, Banner, IconBars, Loading, PageHeader, Table } from '../../shared/ui'
import { RamBudgetMeter } from '../config/models/RamBudgetMeter'
import { useRuntimeStatus } from '../config/runtime/useRuntime'
import { fmtDate } from '../tickets/meta'
import { LatencyStages, ShareList, SplitBar, TimeSeries } from './charts'
import { fmtInt, fmtMs, fmtPct, humanize } from './format'
import { useMetricsSeries, useMetricsSummary, useRecentTurns } from './useMetrics'
import './metrics.css'

const RANGES: MetricsRange[] = ['24h', '7d', '30d']
const RANGE_LABEL: Record<MetricsRange, string> = { '24h': 'últimas 24 h', '7d': 'últimos 7 días', '30d': 'últimos 30 días' }

function Panel({ title, meta, children, wide, className = '' }: { title: string; meta?: ReactNode; children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <section className={`mpanel ticked${wide ? ' is-wide' : ''} ${className}`}>
      <header className="mpanel-head"><h3>{title}</h3>{meta && <span className="section-meta">{meta}</span>}</header>
      {children}
    </section>
  )
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'accent' }) {
  return (
    <div className={`tile${tone ? ` tile-${tone}` : ''}`}>
      <p className="tile-label">{label}</p>
      <p className="tile-value mono">{value}</p>
      {hint && <p className="tile-hint">{hint}</p>}
    </div>
  )
}

function Counter({ label, value, note, good }: { label: string; value: number; note: string; good?: boolean }) {
  return (
    <li className="counter">
      <span className="counter-top"><span className={`led${good && value === 0 ? '' : ' led-off'}`} data-on={good && value === 0 ? 'ok' : undefined} aria-hidden="true" /><span className="counter-label">{label}</span></span>
      <span className="counter-value mono">{fmtInt(value)}</span>
      <span className="counter-note">{note}</span>
    </li>
  )
}

function Live() {
  const rt = useRuntimeStatus()
  return (
    <section className="live">
      <div className="section-head"><div className="section-title"><h2>Runtime en vivo</h2><span className="section-meta">actualiza cada 5 s</span></div></div>
      <div className="live-grid">
        <div className="mpanel ticked">
          <header className="mpanel-head"><h3>Proveedores</h3></header>
          {rt.isLoading && <Loading label="Consultando proveedores…" />}
          {rt.error && <p className="muted-note">Sin respuesta del runtime.</p>}
          {rt.data && (rt.data.providers.length === 0 ? <p className="muted-note">No hay proveedores configurados.</p> : (
            <ul className="prov">
              {rt.data.providers.map((p) => (
                <li key={String(p.provider_id)}>
                  <span className={`led`} data-on={p.reachable ? 'ok' : undefined} aria-hidden="true" style={p.reachable ? undefined : { background: 'var(--err)', boxShadow: '0 0 8px var(--err)' }} />
                  <span className="prov-name">{p.name}</span>
                  <Badge tone={p.reachable ? 'success' : 'danger'}>{p.reachable ? 'Alcanzable' : 'Sin respuesta'}</Badge>
                  <span className="mono prov-ms">{p.latency_ms != null ? fmtMs(p.latency_ms) : '—'}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <RamBudgetMeter />
      </div>
    </section>
  )
}

const CASE_LABEL = { en_curso: 'En curso', escalado: 'Escalado', sin_actividad: 'Sin actividad' } as const

/** Agent section: built only from the existing /api/diagnostics list (no dedicated endpoint yet). */
function AgentSection() {
  const cases = useQuery({ queryKey: ['metrics', 'agent-cases'], queryFn: () => listCases(100), refetchInterval: 20000, refetchIntervalInBackground: false })
  const counts = new Map<string, number>()
  for (const c of cases.data ?? []) counts.set(c.status, (counts.get(c.status) ?? 0) + 1)
  const items = (Object.keys(CASE_LABEL) as (keyof typeof CASE_LABEL)[])
    .map((k): [string, number] => [CASE_LABEL[k], counts.get(k) ?? 0]).filter(([, n]) => n > 0)
  return (
    <section className="live">
      <div className="section-head"><div className="section-title"><h2>Agente</h2><span className="section-meta">últimos 100 casos</span></div></div>
      <div className="mgrid">
        <Panel title="Casos por estado">
          {cases.isLoading && <Loading label="Leyendo casos…" />}
          {cases.error && <p className="muted-note">Sin datos de casos.</p>}
          {cases.data && (items.length ? <ShareList items={items} /> : <p className="muted-note">Aún no hay casos registrados.</p>)}
        </Panel>
        <Panel title="Temas sin documentar">
          <p className="muted-note">Preguntas que el agente no pudo respaldar con documentos.</p>
          <p className="stat-line"><Link className="turn-link" to="/conocimiento">Ver brechas en Conocimiento →</Link></p>
        </Panel>
      </div>
    </section>
  )
}

function Dashboard({ s, range }: { s: MetricsSummary; range: MetricsRange }) {
  const series = useMetricsSeries(range)
  const turns = useRecentTurns()
  const intents = Object.entries(s.turns.by_intent).sort((a, b) => b[1] - a[1])
  const rag = s.rag
  const q = s.quality
  return (
    <>
      <div className="tiles">
        <Tile label="Turnos" value={fmtInt(s.turns.total)} hint={s.turns.interrupted ? `${s.turns.interrupted} interrumpidos` : 'ninguno interrumpido'} />
        <Tile label="Sesiones" value={fmtInt(s.sessions.in_range)} hint={RANGE_LABEL[range]} />
        <Tile label="Latencia total p50" value={fmtMs(s.latency_ms.total.p50)} hint={`p95 ${fmtMs(s.latency_ms.total.p95)}`} tone="accent" />
        <Tile label="Primer token p50" value={fmtMs(s.latency_ms.llm_first_token.p50)} hint={`p95 ${fmtMs(s.latency_ms.llm_first_token.p95)}`} />
        <Tile label="Aciertos de caché" value={fmtPct(s.tokens.cache_hit_ratio)} hint={s.tokens.prompt_avg != null ? `${fmtInt(Math.round(s.tokens.cached_avg ?? 0))} de ${fmtInt(Math.round(s.tokens.prompt_avg))} tokens de prompt` : 'prefijo del prompt'} />
        <Tile label="Tickets abiertos" value={fmtInt(s.tickets.open)} hint={`${s.tickets.created_in_range} creados · ${s.tickets.in_progress} en curso`} />
      </div>

      <div className="mgrid">
        <Panel title="Latencia por etapa" meta="CPU local · sin GPU" wide>
          <LatencyStages data={s.latency_ms} />
          <p className="note">Todo corre en un portátil sin GPU: estos tiempos describen ese hardware, no un servicio en la nube.</p>
        </Panel>

        <Panel title="Turnos y latencia en el tiempo" meta={series.data ? (series.data.bucket === 'hour' ? 'por hora' : 'por día') : undefined} wide>
          {series.isLoading && <Loading label="Leyendo serie…" />}
          {series.error && <Banner tone="error">{errorMessage(series.error)}</Banner>}
          {series.data && <TimeSeries data={series.data} />}
        </Panel>

        <Panel title="Intenciones">
          {intents.length ? <ShareList items={intents} /> : <p className="muted-note">Sin turnos clasificados.</p>}
        </Panel>
        <Panel title="Texto y voz">
          <SplitBar a={s.turns.by_mode.text} b={s.turns.by_mode.voice} aLabel="Texto" bLabel="Voz" />
          <p className="note">La voz suma los tiempos de STT y TTS al turno.</p>
        </Panel>

        <Panel title="Salud del RAG" meta="¿encontró contexto?">
          <SplitBar a={rag.turns_with_sources} b={rag.no_context_turns} aLabel="Con fuentes" bLabel="Sin contexto" bClass="bar-warn" />
          <p className="stat-line">Puntaje medio de la mejor fuente <b className="mono">{rag.avg_top_score != null ? rag.avg_top_score.toFixed(2) : '—'}</b></p>
          <p className="note">Un turno sin contexto responde sin respaldo documental. Si crece, falta material en Conocimiento.</p>
        </Panel>
        <Panel title="Calidad de respuesta" meta="correcciones automáticas">
          <ul className="counters">
            <Counter good label="Voseo" value={q.voseo_hits} note="Formas rioplatenses detectadas en la salida." />
            <Counter label="Citas quitadas" value={q.citations_removed} note="Referencias [n] sin fuente real, eliminadas." />
            <Counter label="Reescrituras" value={q.final_text_rewrites} note="Textos finales corregidos tras el streaming." />
            <Counter label="Cortes por longitud" value={q.length_cutoffs} note="Respuestas truncadas al llegar al límite." />
          </ul>
        </Panel>

        <Panel title="Herramientas" wide>
          <Table rows={s.tools} rowKey={(t) => t.name} empty="Ninguna herramienta se usó en este rango."
            columns={[
              { header: 'Herramienta', render: (t) => <span className="cell-strong">{t.name}</span> },
              { header: 'Llamadas', className: 'col-mono num', render: (t) => fmtInt(t.calls) },
              { header: 'Correctas', className: 'col-mono num', render: (t) => fmtInt(t.ok) },
              { header: 'Errores', className: 'col-mono num', render: (t) => (t.errors ? <span className="err-n">{fmtInt(t.errors)}</span> : '0') },
              { header: 'Promedio', className: 'col-mono num', render: (t) => fmtMs(t.avg_ms) },
            ]} />
        </Panel>
        <Panel title="Carga de modelos" meta="un modelo a la vez" wide>
          <Table rows={s.model_loads} rowKey={(m) => `${m.profile}-${m.role}`} empty="Sin cargas de modelos en este rango."
            columns={[
              { header: 'Perfil', render: (m) => <span className="cell-strong">{m.profile}</span> },
              { header: 'Rol', className: 'col-mono', render: (m) => m.role },
              { header: 'Cargas', className: 'col-mono num', render: (m) => fmtInt(m.loads) },
              { header: 'Expulsiones', className: 'col-mono num', render: (m) => fmtInt(m.evictions) },
              { header: 'Errores', className: 'col-mono num', render: (m) => (m.errors ? <span className="err-n">{fmtInt(m.errors)}</span> : '0') },
              { header: 'Carga media', className: 'col-mono num', render: (m) => fmtMs(m.avg_ms) },
            ]} />
        </Panel>

        <Panel title="Turnos recientes" meta="últimos 50" wide>
          {turns.isLoading && <Loading label="Leyendo turnos…" />}
          {turns.data && (
            <Table rows={turns.data} rowKey={(t) => `${t.session_id}-${t.created_at}`} empty="Aún no hay turnos registrados."
              columns={[
                { header: 'Hora', className: 'col-mono', render: (t) => fmtDate(t.created_at) },
                { header: 'Sesión', render: (t) => <Link className="turn-link clip" to={`/diagnostico/${t.session_id}`} title="Abrir en Diagnóstico">{t.session_title || t.session_id.slice(0, 8)}</Link> },
                { header: 'Intención', render: (t) => humanize(t.intent) },
                { header: 'Modo', render: (t) => <Badge tone={t.input_mode === 'voice' ? 'info' : 'neutral'}>{t.input_mode === 'voice' ? 'Voz' : 'Texto'}</Badge> },
                { header: 'Total', className: 'col-mono num', render: (t) => fmtMs(t.total_ms) },
                { header: '1.er token', className: 'col-mono num', render: (t) => fmtMs(t.llm_first_token_ms) },
                { header: 'RAG', className: 'col-mono num', render: (t) => fmtMs(t.rag_ms) },
                { header: 'Fuentes', className: 'col-mono num', render: (t) => t.sources_count },
                { header: 'Notas', render: (t) => (
                  <span className="flags">
                    {t.interrupted && <Badge tone="warning">Interrumpido</Badge>}
                    {t.finish_reason === 'length' && <Badge tone="warning">Cortado</Badge>}
                    {t.voseo_hits > 0 && <Badge tone="danger">Voseo</Badge>}
                  </span>
                ) },
              ]} />
          )}
        </Panel>
      </div>
    </>
  )
}

export function MetricsView() {
  const [range, setRange] = useState<MetricsRange>('24h')
  const summary = useMetricsSummary(range)
  const s = summary.data

  return (
    <div className="view reveal">
      <PageHeader index="06" kicker="Observabilidad" title="Métricas"
        actions={
          <div className="seg" role="group" aria-label="Rango de tiempo">
            {RANGES.map((r) => <button key={r} type="button" className="seg-btn" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
          </div>
        }>
        Cómo se comporta el agente en este equipo: latencia por etapa, calidad de las respuestas y uso de herramientas.
      </PageHeader>

      {summary.isLoading && <Loading label="Leyendo métricas…" />}
      {summary.error && !s && <Banner tone="error">{errorMessage(summary.error)}</Banner>}
      {s && (s.turns.total === 0 ? (
        <div className="bay bay-compact ticked">
          <div className="bay-icon"><IconBars size={26} /></div>
          <p className="bay-tag"><span className="led led-off" aria-hidden="true" />Sin señal</p>
          <h2 className="bay-title">Aún no hay turnos en este rango</h2>
          <p className="page-desc">Converse con el agente y las métricas aparecerán aquí. Pruebe un rango más amplio si ya hubo actividad.</p>
        </div>
      ) : <div className={summary.isPlaceholderData ? 'is-stale' : undefined}><Dashboard s={s} range={range} /></div>)}
      <AgentSection />
      <Live />
    </div>
  )
}
