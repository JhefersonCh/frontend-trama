import { API_BASE, request } from './client'

export interface AgentNotification {
  id: string
  kind: string
  text: string
  created_at: string
  delivered_at: string | null
}

export const listNotifications = (sessionId: string) =>
  request<AgentNotification[]>(`${API_BASE}/notifications?session_id=${encodeURIComponent(sessionId)}`)
export const ackNotification = (id: string) =>
  request<void>(`${API_BASE}/notifications/${encodeURIComponent(id)}/ack`, { method: 'POST' })

/** Badge copy by notification kind. */
export function notificationBadge(kind: string): string {
  if (kind === 'followup') return 'seguimiento'
  if (kind === 'ticket_update' || kind === 'outage_update') return 'actualización del caso'
  return 'aviso'
}
