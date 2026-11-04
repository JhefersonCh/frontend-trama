import type { TicketCategory, TicketPriority, TicketStatus } from '../../shared/api/tickets'
import type { Tone } from '../../shared/ui'

export const STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Abierto', tone: 'accent' },
  in_progress: { label: 'En curso', tone: 'info' },
  resolved: { label: 'Resuelto', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'neutral' },
}
export const PRIORITY: Record<TicketPriority, { label: string; tone: Tone }> = {
  low: { label: 'Baja', tone: 'neutral' },
  medium: { label: 'Media', tone: 'info' },
  high: { label: 'Alta', tone: 'warning' },
  critical: { label: 'Crítica', tone: 'danger' },
}
export const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'connectivity', label: 'Conectividad' },
  { value: 'dhcp', label: 'DHCP' },
  { value: 'dns', label: 'DNS' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'ethernet', label: 'Ethernet' },
  { value: 'vlan', label: 'VLAN' },
  { value: 'latency', label: 'Latencia' },
  { value: 'other', label: 'Otro' },
]
export const statusOptions = (Object.keys(STATUS) as TicketStatus[]).map((v) => ({ value: v, label: STATUS[v].label }))
export const priorityOptions = (Object.keys(PRIORITY) as TicketPriority[]).map((v) => ({ value: v, label: PRIORITY[v].label }))

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export function fmtValue(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') return STATUS[v as TicketStatus]?.label ?? PRIORITY[v as TicketPriority]?.label ?? v
  return JSON.stringify(v)
}
