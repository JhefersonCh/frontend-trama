import { API_BASE, request } from './client'

export type LifecycleState =
  | 'nuevo' | 'entendiendo' | 'diagnosticando' | 'intentando_solucion' | 'verificando'
  | 'resuelto' | 'escalado' | 'seguimiento' | 'cerrado'
export type HypothesisStatus = 'viva' | 'aceptada' | 'descartada'
export type TracePhase = 'percibir' | 'creer' | 'decidir' | 'actuar' | 'verificar' | 'proactivo'

export interface AgentFact {
  key: string; label?: string; value: unknown; source: string; certainty?: number; created_at?: string
}
export interface AgentHypothesis { key: string; label?: string; cf: number; status: HypothesisStatus }
export interface TraceEntry {
  id?: string; turn_id?: string | null; phase: TracePhase; rules_fired?: string[]
  action?: string | null; autonomy?: string | null; reason?: string | null; created_at: string
}
export interface AgentCase {
  state: LifecycleState
  goal?: string
  subgoals?: { key: string; label: string; done: boolean }[]
  verified?: boolean
  ticket?: { ticket_number: string } | string | null
  facts: AgentFact[]
  hypotheses: AgentHypothesis[]
  trace: TraceEntry[]
}
export interface Explanation {
  text?: string
  rules?: { id: string; text?: string }[]
  facts?: { key: string; value: unknown; source?: string }[]
  cf?: number
  [k: string]: unknown
}

export const getAgentCase = (sessionId: string) => request<AgentCase>(`${API_BASE}/cases/${encodeURIComponent(sessionId)}`)
export const explainCase = (sessionId: string, target: string) =>
  request<Explanation>(`${API_BASE}/cases/${encodeURIComponent(sessionId)}/explain?target=${encodeURIComponent(target)}`)
