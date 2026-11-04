import { API_BASE, request } from './client'

/** A chat (conversation session) as shown in the chat list. */
export interface ChatSession {
  id: string
  /** Auto-set by the backend from the first user message; null until then. */
  title: string | null
  started_at: string
  /** Last activity; falls back to last_message_at / started_at on older backends. */
  updated_at: string
  message_count: number
  channel: string
  archived: boolean
}

type RawSession = {
  id?: unknown; title?: unknown; started_at?: unknown; updated_at?: unknown; last_message_at?: unknown
  message_count?: unknown; channel?: unknown; archived?: unknown; archived_at?: unknown; status?: unknown
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

export function toChatSession(raw: RawSession): ChatSession | null {
  const id = str(raw.id)
  if (!id) return null
  const started = str(raw.started_at) ?? ''
  return {
    id,
    title: str(raw.title)?.trim() ?? null,
    started_at: started,
    updated_at: str(raw.updated_at) ?? str(raw.last_message_at) ?? started,
    message_count: typeof raw.message_count === 'number' ? raw.message_count : 0,
    channel: str(raw.channel) ?? 'web',
    archived: raw.archived === true || !!str(raw.archived_at) || raw.status === 'archived',
  }
}

const time = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

/** GET /api/sessions — newest activity first. Tolerates a bare array or {items|sessions}. */
export async function listSessions(includeArchived = false): Promise<ChatSession[]> {
  const body = await request<unknown>(`${API_BASE}/sessions?include_archived=${includeArchived}`)
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object'
      ? ((body as { items?: unknown; sessions?: unknown }).items ?? (body as { sessions?: unknown }).sessions)
      : null
  if (!Array.isArray(list)) return []
  return list
    .map((r) => (r && typeof r === 'object' ? toChatSession(r as RawSession) : null))
    .filter((s): s is ChatSession => s !== null && (includeArchived || !s.archived))
    .sort((a, b) => time(b.updated_at) - time(a.updated_at))
}

export async function createSession(): Promise<ChatSession> {
  const s = toChatSession(await request<RawSession>(`${API_BASE}/sessions`, { method: 'POST', json: {} }))
  if (!s) throw new Error('El servidor no devolvió el id del chat nuevo.')
  return s
}

export const updateSession = (id: string, patch: { title?: string; archived?: boolean }) =>
  request<unknown>(`${API_BASE}/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', json: patch })

export const deleteSession = (id: string) =>
  request<void>(`${API_BASE}/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
