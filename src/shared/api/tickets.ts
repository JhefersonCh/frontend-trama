import { API_BASE, request } from './client'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketCategory = 'connectivity' | 'dhcp' | 'dns' | 'wifi' | 'ethernet' | 'vlan' | 'latency' | 'other'

export interface TicketSummary {
  ticket_number: string
  status: TicketStatus
  priority: TicketPriority
  title: string
  created_at: string
  updated_at: string
  technician_id?: string | null
  technician_name?: string | null
  sla_due_at?: string | null
}

export interface HandoffSummary {
  sintomas?: string[]
  hipotesis?: { key: string; label?: string; cf: number }[]
  pasos_probados?: string[]
  evidencia?: { key: string; value: unknown; source?: string }[]
  fuentes?: string[]
  preferencias?: { zona?: string; modalidad?: string; franja?: string }
  conversacion?: string
}

export interface TicketTimeline {
  events: TicketEvent[]
  sla_due_at?: string | null
  opened_at?: string | null
  technician?: { id: string; name: string; level?: string; specialties?: string[]; zones?: string[] } | null
  handoff_summary?: HandoffSummary | null
  has_contact?: boolean
  session_id?: string | null
}

export interface TicketEvent {
  event_type: string
  old_value?: unknown
  new_value?: unknown
  details?: unknown
  created_at: string
}

export interface TicketDetail extends TicketSummary {
  description?: string | null
  category?: TicketCategory | string | null
  site?: string | null
  evidence?: unknown[] | null
  events?: TicketEvent[] | null
}

export interface TicketInput {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  session_id: null
  evidence: unknown[]
}

export interface TicketFilters { status?: TicketStatus | ''; technicianId?: string; unassigned?: boolean }

export const listTickets = (f: TicketFilters = {}, limit = 100) => {
  const q = new URLSearchParams()
  if (f.status) q.set('status', f.status)
  if (f.technicianId) q.set('technician_id', f.technicianId)
  if (f.unassigned) q.set('unassigned', 'true')
  q.set('limit', String(limit))
  return request<TicketSummary[]>(`${API_BASE}/tickets?${q}`)
}
export const getTicket = (n: string) => request<TicketDetail>(`${API_BASE}/tickets/${encodeURIComponent(n)}`)
export const patchTicket = (n: string, body: { status?: TicketStatus; priority?: TicketPriority }) =>
  request<TicketDetail>(`${API_BASE}/tickets/${encodeURIComponent(n)}`, { method: 'PATCH', json: body })
export const createTicket = (body: TicketInput) =>
  request<TicketSummary>(`${API_BASE}/tickets`, { method: 'POST', json: body })
export const getTimeline = (n: string) => request<TicketTimeline>(`${API_BASE}/tickets/${encodeURIComponent(n)}/timeline`)
export const assignTicket = (n: string, body: { technician_id: string } | { auto: true }) =>
  request<unknown>(`${API_BASE}/tickets/${encodeURIComponent(n)}/assign`, { method: 'POST', json: body })
export const addTicketNote = (n: string, body: { technician_id: string; text: string }) =>
  request<unknown>(`${API_BASE}/tickets/${encodeURIComponent(n)}/notes`, { method: 'POST', json: body })
