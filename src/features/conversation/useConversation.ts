import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  confirmResponse, loadSessionId, mediaMessage, newTurnId, notificationAck, saveSessionId, SessionSocket, uiEvent,
  type ClientMessage, type PageContext, type ServerMessage, type SourceItem,
} from '../../shared/api/ws'
import { ackNotification, listNotifications } from '../../shared/api/notifications'
import { conversationReducer, initialConversation, type HistoryMessage, type UserMedia } from './conversationReducer'

type AudioChunk = Extract<ServerMessage, { type: 'audio_chunk' }>

/** Tolerant mapping of GET /api/sessions/{id}/messages (array or {messages|items}). */
function toHistory(body: unknown): HistoryMessage[] {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object'
      ? ((body as { messages?: unknown; items?: unknown }).messages ?? (body as { items?: unknown }).items)
      : null
  if (!Array.isArray(list)) return []
  const out: HistoryMessage[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const m = raw as { role?: unknown; text?: unknown; content?: unknown; sources?: unknown; input_mode?: unknown; media?: unknown; media_url?: unknown }
    if (m.role === 'ui') {
      const ui = uiRow(raw as Record<string, unknown>)
      if (ui) out.push(ui)
      continue
    }
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const text = typeof m.text === 'string' ? m.text : typeof m.content === 'string' ? m.content : ''
    const media = m.role === 'user' ? userMedia(m.media, m.media_url) : undefined
    if (!text && !media) continue
    out.push({
      role: m.role, text,
      via: m.input_mode === 'voice' ? 'voice' : 'text',
      sources: Array.isArray(m.sources) ? (m.sources as SourceItem[]) : undefined,
      ...(media ? { media } : {}),
    })
  }
  return out
}

/** `role: ui` row: fields at the top level, or JSON in `content` (as stored in conversation_messages). */
function uiRow(r: Record<string, unknown>): HistoryMessage | null {
  let o = r
  if (typeof r.component !== 'string' && typeof r.content === 'string') {
    try { const parsed = JSON.parse(r.content); if (parsed && typeof parsed === 'object') o = { ...r, ...parsed } } catch { return null }
  }
  if (typeof o.component !== 'string' || typeof o.id !== 'string') return null
  return { role: 'ui', id: o.id, component: o.component, props: o.props, fallback_text: typeof o.fallback_text === 'string' ? o.fallback_text : '' }
}

function userMedia(media: unknown, mediaUrl: unknown): UserMedia | undefined {
  if (media && typeof media === 'object') {
    const m = media as { url?: unknown; kind?: unknown; media_id?: unknown }
    if (typeof m.url === 'string' && (m.kind === undefined || m.kind === 'image')) return { kind: 'image', url: m.url, mediaId: typeof m.media_id === 'string' ? m.media_id : undefined }
  }
  return typeof mediaUrl === 'string' ? { kind: 'image', url: mediaUrl } : undefined
}

/**
 * One live chat over the session socket. `routeSessionId` is the chat selected in
 * the URL: changing it resets the transcript, re-sends start_session with that id
 * (socket restart) and loads its history.
 */
export interface SessionStore { load: () => string | null; save: (id: string | null) => void }
const MAIN_STORE: SessionStore = { load: loadSessionId, save: saveSessionId }

export function useConversation(
  routeSessionId: string | null = null,
  { enabled = true, store = MAIN_STORE, getContext }: { enabled?: boolean; store?: SessionStore; getContext?: () => PageContext | undefined } = {},
) {
  const getContextRef = useRef(getContext)
  getContextRef.current = getContext
  const loadSessionId = store.load
  const saveSessionId = store.save
  const [state, dispatch] = useReducer(conversationReducer, undefined, () => initialConversation(routeSessionId ?? loadSessionId()))
  const [historyLoading, setHistoryLoading] = useState(false)
  /** Set when the server binds us to a session we did not ask for (fresh or replacement). */
  const [assigned, setAssigned] = useState<string | null>(null)
  const socketRef = useRef<SessionSocket | null>(null)
  const voiceRef = useRef(false)
  const audioListener = useRef<((c: AudioChunk) => void) | null>(null)
  /** Session the socket is bound to (requested or assigned by the server). */
  const boundRef = useRef<string | null>(routeSessionId ?? loadSessionId())
  /** Session whose history is loaded (or that needs none because it was born live). */
  const historyFor = useRef<string | null>(null)
  const routeRef = useRef(routeSessionId)
  routeRef.current = routeSessionId

  useEffect(() => {
    // Connect only once we know which chat to open (avoids the server minting an empty one).
    if (!enabled) return
    if (routeRef.current) boundRef.current = routeRef.current
    // The socket reads the persisted id on (re)connect.
    if (boundRef.current) saveSessionId(boundRef.current)
    const socket = new SessionSocket({
      getVoice: () => voiceRef.current,
      sessionStore: store,
      onStatus: (status) => dispatch({ type: 'connection', status }),
      onMessage: (msg) => {
        if (msg.type === 'audio_chunk') { audioListener.current?.(msg); return }
        if (msg.type === 'session' && msg.session_id !== boundRef.current) {
          // The server created a fresh session (none requested, or the old one is gone).
          boundRef.current = msg.session_id
          historyFor.current = msg.session_id
          setAssigned(msg.session_id)
        }
        if (msg.type === 'notification') socket.send(notificationAck(msg.id))
        dispatch({ type: 'server', msg })
      },
    })
    socketRef.current = socket
    socket.connect()
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [enabled])

  // Follow the chat selected in the URL, then restore its transcript.
  useEffect(() => {
    const sid = routeSessionId
    if (!sid) return
    if (sid !== boundRef.current) {
      boundRef.current = sid
      historyFor.current = null
      saveSessionId(sid)
      dispatch({ type: 'reset', sessionId: sid })
      socketRef.current?.restart()
    }
    if (historyFor.current === sid) return
    historyFor.current = sid
    const ctrl = new AbortController()
    setHistoryLoading(true)
    fetch(`/api/sessions/${encodeURIComponent(sid)}/messages`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.status === 404) return
        if (!res.ok) return
        const messages = toHistory(await res.json())
        if (messages.length && boundRef.current === sid) dispatch({ type: 'history', messages })
      })
      .then(async () => {
        // Undelivered proactive messages for this chat (the socket may also push them: the reducer dedupes by id).
        const pending = (await listNotifications(sid)).filter((n) => !n.delivered_at)
        if (!pending.length || boundRef.current !== sid || ctrl.signal.aborted) return
        dispatch({ type: 'notifications', items: pending })
        for (const n of pending) void ackNotification(n.id).catch(() => { /* retried on the next load */ })
      })
      .catch(() => { /* offline or aborted: the live session still works */ })
      .finally(() => { if (!ctrl.signal.aborted) setHistoryLoading(false) })
    return () => {
      ctrl.abort()
      setHistoryLoading(false)
      if (historyFor.current === sid) historyFor.current = null
    }
  }, [routeSessionId])

  const send = useCallback((msg: ClientMessage) => socketRef.current?.send(msg), [])

  const sendText = useCallback((text: string) => {
    const turnId = newTurnId()
    dispatch({ type: 'user_text', turnId, text })
    const context = getContextRef.current?.()
    send({ type: 'text_message', turn_id: turnId, text, ...(context ? { context } : {}) })
    return turnId
  }, [send])

  const sendAudio = useCallback((data: string) => {
    const turnId = newTurnId()
    dispatch({ type: 'user_voice', turnId })
    send({ type: 'audio_segment', turn_id: turnId, mime: 'audio/wav', data })
    return turnId
  }, [send])

  const cancel = useCallback((turnId: string) => send({ type: 'cancel', turn_id: turnId }), [send])

  const setVoice = useCallback((voice: boolean) => {
    voiceRef.current = voice
    send({ type: 'set_voice', voice })
  }, [send])

  const sendProgress = useCallback((turnId: string, playedSeq: number) => {
    send({ type: 'playback_progress', turn_id: turnId, played_seq: playedSeq })
  }, [send])

  const answerConfirm = useCallback((entryId: string, turnId: string, action: string, accepted: boolean) => {
    dispatch({ type: 'confirm_answer', id: entryId, accepted })
    send(confirmResponse(turnId, action, accepted))
  }, [send])

  /** Photo turn: `media_message` with the uploaded id; the bubble shows `previewUrl`. */
  const sendMedia = useCallback((mediaId: string, text: string, previewUrl: string) => {
    const msg = mediaMessage(mediaId, text || undefined)
    dispatch({ type: 'user_text', turnId: msg.turn_id, text, media: { kind: 'image', url: previewUrl, mediaId } })
    send(msg)
    return msg.turn_id
  }, [send])

  /**
   * A generative component was used. Interactions start a turn (the chat shows it is waiting);
   * metric-only ones (opening a report) do not.
   */
  const sendUiEvent = useCallback((
    entryId: string, componentId: string, component: string, action: string, payload: Record<string, unknown>,
    opts: { answer?: string; metric?: boolean } = {},
  ) => {
    const socket = socketRef.current
    const frame = uiEvent(componentId, component, action, payload)
    const turnId = socket ? frame.turn_id : null
    if (socket) socket.send(frame)
    if (!turnId) { dispatch({ type: 'local_error', detail: 'Sin conexión con el agente: no se pudo enviar la respuesta.' }); return false }
    dispatch({ type: 'ui_sent', entryId, turnId: opts.metric ? null : turnId, answer: opts.answer })
    return true
  }, [])

  const setAudioListener = useCallback((fn: ((c: AudioChunk) => void) | null) => { audioListener.current = fn }, [])

  /** Drop the current chat and let the server open a fresh one. */
  const newSession = useCallback(() => {
    boundRef.current = null
    historyFor.current = null
    saveSessionId(null)
    dispatch({ type: 'reset' })
    socketRef.current?.restart()
  }, [])

  const reportError = useCallback((detail: string) => dispatch({ type: 'local_error', detail }), [])

  return useMemo(() => ({
    state, historyLoading, assigned, sendText, sendAudio, sendMedia, sendUiEvent, cancel, setVoice, sendProgress, setAudioListener, newSession, reportError, answerConfirm,
  }), [state, historyLoading, assigned, sendText, sendAudio, sendMedia, sendUiEvent, cancel, setVoice, sendProgress, setAudioListener, answerConfirm, newSession, reportError])
}

export type Conversation = ReturnType<typeof useConversation>
export type { AudioChunk }
