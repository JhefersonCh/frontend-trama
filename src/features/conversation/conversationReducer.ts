import type { ConnectionStatus, ServerMessage, ServerState, SourceItem, TopHypothesis, TurnMetrics } from '../../shared/api/ws'
import { CLOSE_ON_USER_TURN, isOneShot } from '../genui/registry'

export interface ToolEntry {
  name: string
  arguments: unknown
  result?: { ok: boolean; summary?: string }
}

export type ChatEntry =
  | {
      kind: 'user'; id: string; turnId?: string; text: string; via: 'text' | 'voice'; pending: boolean
      /** Attached photo (local preview URL or the served media URL). */
      media?: UserMedia
    }
  | {
      kind: 'assistant'; id: string; turnId?: string; text: string; streaming: boolean; interrupted: boolean
      tools: ToolEntry[]; sources: SourceItem[]; metrics?: TurnMetrics
      /** Proactive message (follow-up, ticket update): shown with a badge. */
      notification?: { id: string; kind: string }
    }
  | {
      kind: 'confirm'; id: string; turnId: string; action: string; summary: string
      /** null = waiting; 'other' = answered some other way (typed or spoken). */
      answer: 'yes' | 'no' | 'other' | null
    }
  | { kind: 'error'; id: string; turnId?: string; detail: string }
  | {
      /** Generative UI component (ui_component frame or a `role: ui` history row). */
      kind: 'ui'; id: string; turnId?: string; componentId: string; component: string; props: unknown
      fallbackText: string; spoken?: string
      /** One-shot components: summary shown once answered (collapsed row). */
      answer: string | null
    }

export interface UserMedia { kind: 'image'; url: string; mediaId?: string }

export const ANSWERED_ELSEWHERE = 'Respondido en la conversación'
export interface ConversationState {
  entries: ChatEntry[]
  serverState: ServerState
  stateDetail?: string
  activeTurn: string | null
  sessionId: string | null
  connection: ConnectionStatus
  /** Transient status of the running turn ("Estoy revisando su caso…"). */
  progress: string | null
  /** Latest agent case summary from `case_update`. */
  caseView: CaseView | null
}

export interface CaseView { state: string; hypotheses: TopHypothesis[]; verified: boolean }

export type HistoryMessage =
  | { role: 'user' | 'assistant'; text: string; via?: 'text' | 'voice'; sources?: SourceItem[]; media?: UserMedia }
  | { role: 'ui'; id: string; component: string; props: unknown; fallback_text: string }

export type ConversationAction =
  | { type: 'server'; msg: ServerMessage }
  | { type: 'user_text'; turnId: string; text: string; media?: UserMedia }
  /** A generative component was used: optional collapse summary; `turnId` marks the chat as waiting. */
  | { type: 'ui_sent'; entryId: string; turnId: string | null; answer?: string }
  | { type: 'user_voice'; turnId: string }
  | { type: 'connection'; status: ConnectionStatus }
  | { type: 'history'; messages: HistoryMessage[] }
  | { type: 'local_error'; detail: string }
  | { type: 'reset'; sessionId?: string | null }
  | { type: 'confirm_answer'; id: string; accepted: boolean }
  | { type: 'notifications'; items: { id: string; kind: string; text: string }[] }

export const initialConversation = (sessionId: string | null = null): ConversationState => ({
  entries: [],
  serverState: 'idle',
  activeTurn: null,
  sessionId,
  connection: 'connecting',
  progress: null,
  caseView: null,
})

let seq = 0
const uid = (p: string) => `${p}-${++seq}`

function upsertAssistant(entries: ChatEntry[], turnId: string, patch: (e: Extract<ChatEntry, { kind: 'assistant' }>) => Extract<ChatEntry, { kind: 'assistant' }>): ChatEntry[] {
  const idx = findLastIndex(entries, (e) => e.kind === 'assistant' && e.turnId === turnId)
  if (idx === -1) {
    const fresh: ChatEntry = { kind: 'assistant', id: uid('a'), turnId, text: '', streaming: true, interrupted: false, tools: [], sources: [] }
    return [...entries, patch(fresh)]
  }
  const next = entries.slice()
  next[idx] = patch(entries[idx] as Extract<ChatEntry, { kind: 'assistant' }>)
  return next
}

function findLastIndex<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i
  return -1
}

/** Close any streaming assistant entry (connection dropped mid-turn). */
function settleStreaming(entries: ChatEntry[]): ChatEntry[] {
  if (!entries.some((e) => e.kind === 'assistant' && e.streaming) && !entries.some((e) => e.kind === 'user' && e.pending)) return entries
  return entries.map((e) => {
    if (e.kind === 'assistant' && e.streaming) return { ...e, streaming: false, interrupted: true }
    if (e.kind === 'user' && e.pending) return { ...e, pending: false }
    return e
  })
}

/** A new user turn settles any confirmation still open (the answer went by text or voice). */
function closeConfirms(entries: ChatEntry[]): ChatEntry[] {
  const open = (e: ChatEntry) =>
    (e.kind === 'confirm' && e.answer === null) || (e.kind === 'ui' && e.answer === null && CLOSE_ON_USER_TURN.has(e.component))
  if (!entries.some(open)) return entries
  return entries.map((e) => {
    if (!open(e)) return e
    return e.kind === 'confirm' ? { ...e, answer: 'other' } : e.kind === 'ui' ? { ...e, answer: ANSWERED_ELSEWHERE } : e
  })
}

/** Append a component, or replace the one with the same component id in place (live update). */
function upsertUi(entries: ChatEntry[], msg: Extract<ServerMessage, { type: 'ui_component' }>): ChatEntry[] {
  const idx = findLastIndex(entries, (e) => e.kind === 'ui' && e.componentId === msg.id)
  const fallbackText = msg.fallback_text ?? ''
  if (idx === -1) {
    return [...entries, {
      kind: 'ui', id: uid('g'), turnId: msg.turn_id, componentId: msg.id, component: msg.component, props: msg.props,
      fallbackText, spoken: msg.spoken, answer: null,
    }]
  }
  const prev = entries[idx] as Extract<ChatEntry, { kind: 'ui' }>
  const next = entries.slice()
  next[idx] = { ...prev, component: msg.component, props: msg.props, fallbackText, spoken: msg.spoken }
  return next
}

/** History rows → entries. Repeated component ids keep their first position with the latest props. */
function historyEntries(messages: HistoryMessage[]): ChatEntry[] {
  const out: ChatEntry[] = []
  const byComponent = new Map<string, number>()
  messages.forEach((m, i) => {
    if (m.role === 'ui') {
      const answeredLater = isOneShot(m.component) && messages.slice(i + 1).some((x) => x.role === 'user')
      const entry: ChatEntry = {
        kind: 'ui', id: uid('h'), componentId: m.id, component: m.component, props: m.props, fallbackText: m.fallback_text,
        answer: answeredLater ? 'Respondido' : null,
      }
      const at = byComponent.get(m.id)
      if (at !== undefined) out[at] = { ...entry, id: out[at].id }
      else { byComponent.set(m.id, out.length); out.push(entry) }
    } else if (m.role === 'user') {
      out.push({ kind: 'user', id: uid('h'), text: m.text, via: m.via ?? 'text', pending: false, ...(m.media ? { media: m.media } : {}) })
    } else {
      out.push({ kind: 'assistant', id: uid('h'), text: m.text, streaming: false, interrupted: false, tools: [], sources: m.sources ?? [] })
    }
  })
  return out
}

function addNotifications(entries: ChatEntry[], items: { id: string; kind: string; text: string }[]): ChatEntry[] {
  const known = new Set(entries.flatMap((e) => (e.kind === 'assistant' && e.notification ? [e.notification.id] : [])))
  const fresh = items.filter((n) => n.text && !known.has(n.id))
  if (fresh.length === 0) return entries
  return [
    ...entries,
    ...fresh.map<ChatEntry>((n) => ({
      kind: 'assistant', id: uid('n'), text: n.text, streaming: false, interrupted: false, tools: [], sources: [],
      notification: { id: n.id, kind: n.kind },
    })),
  ]
}

function onServer(state: ConversationState, msg: ServerMessage): ConversationState {
  switch (msg.type) {
    case 'session':
      return { ...state, sessionId: msg.session_id }
    case 'state':
      return {
        ...state,
        progress: msg.state === 'idle' ? null : state.progress,
        serverState: msg.state,
        stateDetail: msg.detail,
        activeTurn: msg.turn_id && msg.state !== 'idle' ? msg.turn_id : state.activeTurn,
      }
    case 'transcript': {
      const idx = findLastIndex(state.entries, (e) => e.kind === 'user' && e.turnId === msg.turn_id)
      const entries = state.entries.slice()
      if (idx === -1) entries.push({ kind: 'user', id: uid('u'), turnId: msg.turn_id, text: msg.text, via: 'voice', pending: false })
      else entries[idx] = { ...(entries[idx] as Extract<ChatEntry, { kind: 'user' }>), text: msg.text, pending: false }
      return { ...state, entries, activeTurn: msg.turn_id }
    }
    case 'token':
      return {
        ...state,
        progress: null,
        activeTurn: msg.turn_id,
        entries: upsertAssistant(state.entries, msg.turn_id, (e) => ({ ...e, text: e.text + msg.text, streaming: true })),
      }
    case 'tool_call':
      return {
        ...state,
        entries: upsertAssistant(state.entries, msg.turn_id, (e) => ({ ...e, tools: [...e.tools, { name: msg.name, arguments: msg.arguments }] })),
      }
    case 'tool_result':
      return {
        ...state,
        entries: upsertAssistant(state.entries, msg.turn_id, (e) => {
          const tools = e.tools.slice()
          const i = findLastIndex(tools, (t) => t.name === msg.name && !t.result)
          const result = { ok: msg.ok, summary: msg.summary }
          if (i === -1) tools.push({ name: msg.name, arguments: undefined, result })
          else tools[i] = { ...tools[i], result }
          return { ...e, tools }
        }),
      }
    case 'sources':
      return { ...state, entries: upsertAssistant(state.entries, msg.turn_id, (e) => ({ ...e, sources: msg.items })) }
    case 'turn_end': {
      const has = state.entries.some((e) => e.kind === 'assistant' && e.turnId === msg.turn_id)
      // Backend may send a cleaned/validated answer (labels, bad citations removed): it replaces the streamed text.
      const fixText = (e: Extract<ChatEntry, { kind: 'assistant' }>) => (msg.final_text != null ? { ...e, text: msg.final_text } : e)
      const entries = has
        ? upsertAssistant(state.entries, msg.turn_id, (e) => fixText({ ...e, streaming: false, interrupted: msg.interrupted, metrics: msg.metrics }))
        : msg.interrupted
          ? state.entries
          : upsertAssistant(state.entries, msg.turn_id, (e) => ({ ...e, streaming: false, metrics: msg.metrics }))
      return {
        ...state,
        progress: null,
        entries: entries.map((e) => (e.kind === 'user' && e.turnId === msg.turn_id && e.pending ? { ...e, pending: false } : e)),
        activeTurn: state.activeTurn === msg.turn_id ? null : state.activeTurn,
        serverState: state.activeTurn === msg.turn_id || state.activeTurn === null ? 'idle' : state.serverState,
      }
    }
    case 'error':
      return {
        ...state,
        entries: [...state.entries, { kind: 'error', id: uid('e'), turnId: msg.turn_id, detail: msg.detail }],
      }
    case 'case_update':
      return {
        ...state,
        caseView: { state: msg.state, hypotheses: msg.top_hypotheses ?? [], verified: !!msg.verified },
      }
    case 'progress':
      return { ...state, progress: msg.message || null }
    case 'confirm_request': {
      if (state.entries.some((e) => e.kind === 'confirm' && e.turnId === msg.turn_id && e.action === msg.action)) return state
      return {
        ...state,
        entries: [...state.entries, { kind: 'confirm', id: uid('c'), turnId: msg.turn_id, action: msg.action, summary: msg.summary, answer: null }],
      }
    }
    case 'notification':
      return { ...state, entries: addNotifications(state.entries, [{ id: msg.id, kind: msg.kind, text: msg.text }]) }
    case 'ui_component':
      if (!msg.id || !msg.component) return state
      return { ...state, entries: upsertUi(state.entries, msg) }
    case 'audio_chunk':
      return state // handled by the audio player
  }
}

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'server':
      return onServer(state, action.msg)
    case 'user_text':
      return {
        ...state,
        activeTurn: action.turnId,
        progress: null,
        entries: [
          ...closeConfirms(state.entries),
          { kind: 'user', id: uid('u'), turnId: action.turnId, text: action.text, via: 'text', pending: false, ...(action.media ? { media: action.media } : {}) },
        ],
      }
    case 'ui_sent':
      return {
        ...state,
        ...(action.turnId ? { activeTurn: action.turnId, progress: null } : {}),
        entries: action.answer
          ? state.entries.map((e) => (e.kind === 'ui' && e.id === action.entryId && e.answer === null ? { ...e, answer: action.answer! } : e))
          : state.entries,
      }
    case 'user_voice':
      return {
        ...state,
        activeTurn: action.turnId,
        serverState: 'transcribing',
        progress: null,
        entries: [...closeConfirms(state.entries), { kind: 'user', id: uid('u'), turnId: action.turnId, text: '', via: 'voice', pending: true }],
      }
    case 'connection':
      return action.status === 'open'
        ? { ...state, connection: 'open' }
        : { ...state, connection: action.status, activeTurn: null, serverState: 'idle', progress: null, entries: settleStreaming(state.entries) }
    case 'history':
      return {
        ...state,
        entries: [...historyEntries(action.messages), ...state.entries],
      }
    case 'confirm_answer':
      return {
        ...state,
        entries: state.entries.map((e) => (e.kind === 'confirm' && e.id === action.id && e.answer === null ? { ...e, answer: action.accepted ? 'yes' : 'no' } : e)),
      }
    case 'notifications':
      return { ...state, entries: addNotifications(state.entries, action.items) }
    case 'local_error':
      return { ...state, entries: [...state.entries, { kind: 'error', id: uid('e'), detail: action.detail }] }
    case 'reset':
      return { ...initialConversation(action.sessionId ?? null), connection: state.connection }
  }
}
