import { API_BASE, request } from './client'

export type TechLevel = 'n1' | 'n2'
export type TechAvailability = 'disponible' | 'ocupado' | 'fuera_de_turno' | 'vacaciones'
/** e.g. {"lun-vie": ["08:00","17:00"]} */
export type Schedule = Record<string, [string, string] | string[]>

export interface Technician {
  id: string
  name: string
  specialties: string[]
  zones: string[]
  level: TechLevel
  max_open_tickets: number
  availability: TechAvailability
  schedule: Schedule
  contact_channel?: string | null
  is_active?: boolean
  open_tickets?: number
}
export type TechnicianInput = Omit<Technician, 'id' | 'open_tickets' | 'is_active'>

export interface Workload {
  open_tickets: number
  max_open_tickets?: number
  by_status?: Record<string, number>
  next_due?: string | null
  tickets?: { ticket_number: string; title?: string; status?: string; priority?: string; sla_due_at?: string | null }[]
}

export const listTechnicians = () => request<Technician[]>(`${API_BASE}/technicians`)
export const createTechnician = (body: TechnicianInput) =>
  request<Technician>(`${API_BASE}/technicians`, { method: 'POST', json: body })
export const updateTechnician = (id: string, body: Partial<TechnicianInput>) =>
  request<Technician>(`${API_BASE}/technicians/${encodeURIComponent(id)}`, { method: 'PATCH', json: body })
export const deactivateTechnician = (id: string) =>
  request<void>(`${API_BASE}/technicians/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getWorkload = (id: string) =>
  request<Workload>(`${API_BASE}/technicians/${encodeURIComponent(id)}/workload`)
