import { API_BASE, request } from './client'

export type CaseStatus = 'en_curso' | 'escalado' | 'sin_actividad'
export type ObservationSource = 'user_provided' | 'lab_simulated' | 'server_view'

export interface CaseSummary {
  session_id: string; title: string | null; updated_at: string; last_intent: string | null
  status: CaseStatus; ticket_number: string | null; observations: number; facts: number; summary: string | null
}
export interface CaseDetail {
  session: { id: string; title: string | null; started_at: string; updated_at: string }
  status: CaseStatus
  audience: string | null
  case_state: {
    facts: { key: string; label: string; value: unknown }[]
    steps_tried: string[]; ips: string[]; devices: string | null
  }
  observations: { observation_type: string; target: string | null; result: string | null; unit: string | null; source: ObservationSource; collected_at: string }[]
  sources_used: { title: string; section: string | null; is_synthetic: boolean; times: number; best_score: number | null }[]
  tools: { name: string; ok: boolean; summary: string | null; at: string }[]
  tickets: { ticket_number: string; status: string; priority: string; title: string }[]
  timeline: { at: string; kind: 'user' | 'assistant' | 'tool' | 'sources' | 'ticket'; summary: string; detail: string | null }[]
}

export const listCases = (limit = 30) => request<CaseSummary[]>(`${API_BASE}/diagnostics?limit=${limit}`)
export const getCase = (id: string) => request<CaseDetail>(`${API_BASE}/diagnostics/${encodeURIComponent(id)}`)
