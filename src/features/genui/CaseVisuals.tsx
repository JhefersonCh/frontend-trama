import { useAgentCase } from '../diagnostics/useAgentCase'
import { GenUiBlock } from './GenUiBlock'
import { diagnosisFlow, topology } from './schema'
import { READONLY_ENV } from './types'

/** `GET /api/cases/{sid}` may carry `topology` / `diagnosis_flow` (top level or under `visuals`). */
function pick(data: unknown, key: string): unknown {
  if (!data || typeof data !== 'object') return undefined
  const o = data as Record<string, unknown>
  if (o[key] != null) return o[key]
  const v = o.visuals
  return v && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined
}

/**
 * Network + reasoning diagrams for the Diagnóstico detail, fed from the agent case when the backend
 * includes them. Nothing is rendered otherwise (no extra endpoints are called).
 */
export function CaseVisuals({ sessionId }: { sessionId: string }) {
  const q = useAgentCase(sessionId) // shares the cache with the reasoning panel
  const topo = pick(q.data, 'topology')
  const flow = pick(q.data, 'diagnosis_flow')
  const showTopo = topo != null && topology(topo) !== null
  const showFlow = flow != null && diagnosisFlow(flow) !== null
  if (!showTopo && !showFlow) return null
  const env = READONLY_ENV(sessionId)
  return (
    <div className="gu-case-visuals">
      {showTopo && <GenUiBlock id={`case-topology-${sessionId}`} component="topology" props={topo} fallbackText="" env={env} />}
      {showFlow && <GenUiBlock id={`case-flow-${sessionId}`} component="diagnosis_flow" props={flow} fallbackText="" env={env} />}
    </div>
  )
}
