import { lazy, Suspense } from 'react'
import { FLOW_KIND_LABEL } from './labels'
import { GuFrame, STATUS_LABEL, StatusLed } from './parts'
import type { DiagnosisFlowProps, FlowKind, TopologyProps } from './schema'
import type { GenUiComponentProps } from './types'

// One shared lazy chunk (xyflow + its CSS) for both diagrams.
const loadFlow = () => import('./flow/FlowDiagrams')
const TopologyCanvas = lazy(() => loadFlow().then((m) => ({ default: m.TopologyCanvas })))
const DiagnosisCanvas = lazy(() => loadFlow().then((m) => ({ default: m.DiagnosisCanvas })))

const Skeleton = () => <div className="xf-skel" aria-hidden="true"><span /><span /><span /></div>

/** Home network diagram. The chip strip below is the keyboard / screen-reader path to every node. */
export function Topology({ props, env }: GenUiComponentProps<TopologyProps>) {
  const fails = props.nodes.filter((n) => n.status === 'fail').length
  const warns = props.nodes.filter((n) => n.status === 'warn').length
  const ask = env.interactive ? (nodeId: string) => env.emit('topology_node', { node_id: nodeId }) : undefined
  return (
    <GuFrame
      component="topology"
      eyebrow="Red de la casa"
      meta={fails ? <span className="xf-meta is-fail">{fails} con falla</span> : warns ? <span className="xf-meta is-warn">{warns} por revisar</span> : <span className="xf-meta">sin fallas detectadas</span>}
      label="Diagrama de la red de la casa"
    >
      <Suspense fallback={<Skeleton />}>
        <TopologyCanvas data={props} onNode={ask} />
      </Suspense>
      <ul className="xf-list" aria-label="Equipos de la red">
        {props.nodes.map((n) => (
          <li key={n.id}>
            <button type="button" className="xf-chip" data-status={n.status} disabled={!ask} onClick={() => ask?.(n.id)} title={n.detail ?? undefined}>
              <StatusLed status={n.status} />
              <span className="xf-chip-label">{n.label}</span>
              <span className="xf-chip-status">{STATUS_LABEL[n.status]}</span>
              {n.detail && <span className="sr-only">: {n.detail}</span>}
            </button>
          </li>
        ))}
      </ul>
      {ask && <p className="xf-hint">Toque un equipo para preguntar por ese tramo.</p>}
    </GuFrame>
  )
}

/** Reasoning path: question → answer → rule → hypothesis → action. */
export function DiagnosisFlow({ props }: GenUiComponentProps<DiagnosisFlowProps>) {
  const kinds = (Object.keys(FLOW_KIND_LABEL) as FlowKind[]).filter((k) => props.nodes.some((n) => n.kind === k))
  return (
    <GuFrame component="diagnosis_flow" eyebrow="Camino del diagnóstico" meta={<span className="mono">{props.nodes.length} pasos</span>} label="Camino del diagnóstico">
      <Suspense fallback={<Skeleton />}>
        <DiagnosisCanvas data={props} />
      </Suspense>
      <ul className="xf-legend" aria-hidden="true">
        {kinds.map((k) => <li key={k} data-kind={k}><span className="xf-swatch" />{FLOW_KIND_LABEL[k]}</li>)}
      </ul>
      <ol className="sr-only" aria-label="Pasos del razonamiento">
        {props.nodes.map((n) => <li key={n.id}>{FLOW_KIND_LABEL[n.kind]}: {n.label}{n.detail ? ` (${n.detail})` : ''}</li>)}
      </ol>
    </GuFrame>
  )
}
