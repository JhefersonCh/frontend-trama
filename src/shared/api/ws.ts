/**
 * TRAMA conversation socket: typed protocol + reconnecting client.
 * Contract: /ws/session (see trama-backend). The React state lives in
 * features/conversation; this module is framework-free.
 */

export type ServerState = 'idle' | 'transcribing' | 'retrieving' | 'thinking' | 'speaking' | 'loading_model'

export interface SourceItem {
  title: string
  source_uri?: string | null
  section?: string | null
  score?: number | null
  is_synthetic?: boolean
  document_id?: string | null
  chunk_id?: string | null
  chunk_index?: number | null
  /** The cited passage (~450 chars), so the UI can show what the source says. */
  excerpt?: string | null
}

export interface TurnMetrics {
  stt_ms?: number | null
  rag_ms?: number | null
  llm_first_token_ms?: number | null
  tts_first_audio_ms?: number | null
  total_ms?: number | null
}

/** Page the person is viewing (floating assistant); the backend turns it into a short hint. */
export interface PageContext { route: string; entity?: { type: 'ticket' | 'case' | 'technician'; id: string } }

// ---- Client -> server ----
export type ClientMessage =
  | { type: 'start_session'; session_id?: string; voice: boolean }
  | { type: 'text_message'; turn_id: string; text: string; context?: PageContext }
  | { type: 'audio_segment'; turn_id: string; mime: 'audio/wav'; data: string }
  | { type: 'cancel'; turn_id: string }
  | { type: 'set_voice'; voice: boolean }
  | { type: 'playback_progress'; turn_id: string; played_seq: number }
  | { type: 'confirm_response'; turn_id: string; action: string; accepted: boolean }
  | { type: 'notification_ack'; id: string }
  | { type: 'ui_event'; turn_id: string; component_id: string; component: string; action: string; payload: Record<string, unknown> }
  | { type: 'media_message'; turn_id: string; media_id: string; text?: string }

export interface TopHypothesis { key: string; label: string; cf: number }

// ---- Server -> client ----
export type ServerMessage =
  | { type: 'session'; session_id: string }
  | { type: 'state'; turn_id?: string; state: ServerState; detail?: string }
  | { type: 'transcript'; turn_id: string; text: string }
  | { type: 'token'; turn_id: string; text: string }
  | { type: 'tool_call'; turn_id: string; name: string; arguments: unknown }
  | { type: 'tool_result'; turn_id: string; name: string; ok: boolean; summary?: string }
  | { type: 'sources'; turn_id: string; items: SourceItem[] }
  | { type: 'audio_chunk'; turn_id: string; seq: number; mime: string; data: string; text?: string }
  | { type: 'turn_end'; turn_id: string; interrupted: boolean; metrics?: TurnMetrics; final_text?: string }
  | { type: 'error'; turn_id?: string; detail: string }
  | { type: 'case_update'; state: string; top_hypotheses: TopHypothesis[]; verified?: boolean }
  | { type: 'progress'; turn_id: string; message: string }
  | { type: 'confirm_request'; turn_id: string; action: string; summary: string }
  | { type: 'notification'; id: string; kind: 'followup' | 'ticket_update' | 'outage_update' | (string & {}); text: string }
  /** Generative UI: same `id` again = live replacement of that component. */
  | { type: 'ui_component'; turn_id?: string; id: string; component: string; props: unknown; spoken?: string; fallback_text?: string }

export const confirmResponse = (turnId: string, action: string, accepted: boolean): ClientMessage =>
  ({ type: 'confirm_response', turn_id: turnId, action, accepted })
export const notificationAck = (id: string): ClientMessage => ({ type: 'notification_ack', id })

/** Build a `ui_event` frame. Every interaction starts a new turn (fresh turn id). */
export const uiEvent = (
  componentId: string, component: string, action: string, payload: Record<string, unknown> = {}, turnId: string = newTurnId(),
): Extract<ClientMessage, { type: 'ui_event' }> =>
  ({ type: 'ui_event', turn_id: turnId, component_id: componentId, component, action, payload })

export const mediaMessage = (mediaId: string, text?: string, turnId: string = newTurnId()): Extract<ClientMessage, { type: 'media_message' }> =>
  ({ type: 'media_message', turn_id: turnId, media_id: mediaId, ...(text ? { text } : {}) })

/** Socket currently bound to the open chat (set by SessionSocket.connect, cleared on close). */
let activeSocket: SessionSocket | null = null

/**
 * Send a generative-UI interaction over the live chat socket. Returns the new turn id,
 * or null when no chat is connected (e.g. a component rendered outside the conversation).
 */
export function sendUiEvent(componentId: string, component: string, action: string, payload: Record<string, unknown> = {}): string | null {
  if (!activeSocket) return null
  const msg = uiEvent(componentId, component, action, payload)
  activeSocket.send(msg)
  return msg.turn_id
}

const SERVER_TYPES = new Set<ServerMessage['type']>([
  'session', 'state', 'transcript', 'token', 'tool_call', 'tool_result', 'sources', 'audio_chunk', 'turn_end', 'error',
  'case_update', 'progress', 'confirm_request', 'notification', 'ui_component',
])

export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== 'string') return null
  try {
    const msg = JSON.parse(raw) as { type?: unknown }
    if (msg && typeof msg.type === 'string' && SERVER_TYPES.has(msg.type as ServerMessage['type'])) return msg as ServerMessage
  } catch { /* not JSON */ }
  return null
}

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export function sessionSocketUrl(loc: Pick<Location, 'protocol' | 'host'> = location): string {
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws/session`
}

// ---- Session id persistence (storage may be unavailable) ----
const SESSION_KEY = 'trama.session_id'
export function loadSessionId(): string | null {
  try { return localStorage.getItem(SESSION_KEY) } catch { return null }
}
export function saveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* private mode */ }
}

/** crypto.randomUUID is only available in secure contexts (not on a LAN IP over http). */
export function newTurnId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function' && globalThis.isSecureContext !== false) {
    try { return c.randomUUID() } catch { /* fall through */ }
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface SocketOptions {
  url?: string
  onMessage: (msg: ServerMessage) => void
  onStatus: (status: ConnectionStatus) => void
  /** Voice flag sent with start_session on every (re)connect. */
  getVoice: () => boolean
  /** Where the session id lives (default: the main chat's localStorage key). */
  sessionStore?: { load: () => string | null; save: (id: string | null) => void }
}

/**
 * Reconnects with exponential backoff (0.5s → 10s, jittered), resumes the
 * persisted session_id and queues outgoing messages while not connected.
 */
export class SessionSocket {
  private ws: WebSocket | null = null
  private queue: ClientMessage[] = []
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private closedByUser = false
  private readonly opts: SocketOptions

  constructor(opts: SocketOptions) {
    this.opts = opts
  }

  connect() {
    this.closedByUser = false
    activeSocket = this
    this.open()
  }

  private open() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.opts.onStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(this.opts.url ?? sessionSocketUrl())
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.attempt = 0
      const sid = (this.opts.sessionStore?.load ?? loadSessionId)()
      ws.send(JSON.stringify({ type: 'start_session', ...(sid ? { session_id: sid } : {}), voice: this.opts.getVoice() } satisfies ClientMessage))
      const pending = this.queue
      this.queue = []
      for (const m of pending) ws.send(JSON.stringify(m))
      this.opts.onStatus('open')
    }
    ws.onmessage = (ev) => {
      const msg = parseServerMessage(ev.data)
      if (!msg) return
      if (msg.type === 'session') (this.opts.sessionStore?.save ?? saveSessionId)(msg.session_id)
      this.opts.onMessage(msg)
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.ws = null
      if (this.closedByUser) { this.opts.onStatus('closed'); return }
      this.scheduleReconnect()
    }
    ws.onerror = () => { /* onclose follows */ }
  }

  private scheduleReconnect() {
    this.opts.onStatus('reconnecting')
    const base = Math.min(10_000, 500 * 2 ** this.attempt)
    this.attempt += 1
    this.timer = setTimeout(() => this.open(), base * (0.8 + Math.random() * 0.4))
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
    else if (msg.type !== 'playback_progress') this.queue.push(msg) // progress is stale after a reconnect
  }

  /** Drop the current connection and start a fresh one (e.g. after a new session). */
  restart() {
    const old = this.ws
    this.ws = null
    old?.close()
    this.attempt = 0
    this.open()
  }

  close() {
    this.closedByUser = true
    if (activeSocket === this) activeSocket = null
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.queue = []
    const ws = this.ws
    this.ws = null
    ws?.close()
  }
}
