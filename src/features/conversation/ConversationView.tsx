import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listNotifications } from '../../shared/api/notifications'
import { createSession, listSessions } from '../../shared/api/sessions'
import { loadSessionId } from '../../shared/api/ws'
import { CaseChip } from './CaseChip'
import { ChatList, UNTITLED } from './ChatList'
import { ChatSurface, liveVoiceState } from './ChatSurface'
import { useAssistantLink } from '../assistant/AssistantContext'
import { IconChats, IconCompose } from './glyphs'
import { useConversation } from './useConversation'
import { useVoiceMode } from './useVoiceMode'
import { useVoiceSettings } from './useVoiceSettings'
import { VOICE_LABELS } from './VoiceStateIndicator'
import './conversation.css'

const CONNECTION_LABEL = { connecting: 'Conectando', open: 'En línea', reconnecting: 'Reconectando', closed: 'Desconectado' } as const

const NARROW = '(max-width: 900px)'

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export function ConversationView() {
  const { sessionId: routeId = null } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const sessionsQ = useQuery({ queryKey: ['sessions'], queryFn: () => listSessions(false), staleTime: 15_000 })
  // Without a chat in the URL or storage, wait for the list so we can resume the most recent one.
  const [storedAtMount] = useState(() => loadSessionId())
  // Latched: once the socket may connect it stays connected across chat switches.
  const socketReady = useRef(false)
  if (routeId || storedAtMount || sessionsQ.isError || (sessionsQ.isSuccess && sessionsQ.data.length === 0)) socketReady.current = true
  const conv = useConversation(routeId, { enabled: socketReady.current })
  const settings = useVoiceSettings()
  const voice = useVoiceMode(conv, settings)
  // The wake word lives in the Layout; on this route it starts voice mode in this chat.
  const link = useAssistantLink()
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  const voiceActive = voice.status !== 'off'
  useEffect(() => { link?.setChatVoiceActive(voiceActive) }, [link, voiceActive])
  useEffect(() => {
    link?.setChatWakeHandler(() => { void voiceRef.current.start() })
    return () => { link?.setChatWakeHandler(null); link?.setChatVoiceActive(false) }
  }, [link])

  const [drawer, setDrawer] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const awaitingServerSession = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const narrow = useMedia(NARROW)

  const { state } = conv
  const busy = state.activeTurn !== null
  const voiceOn = voice.status !== 'off'

  const live = liveVoiceState(state, voice)
  const shown = live

  // ---- Chat selection: URL ⇄ socket session ----
  // No chat in the URL: the resumed/stored one, else the most recent, else whatever the server opens.
  const sessions = sessionsQ.data ?? []
  useEffect(() => {
    if (routeId) return
    if (awaitingServerSession.current) return
    const fallback = state.sessionId ?? (sessions.find((s) => s.message_count > 0) ?? sessions[0])?.id ?? null
    if (fallback) navigate(`/conversacion/${fallback}`, { replace: true })
  }, [routeId, state.sessionId, sessions, navigate])

  // The server may hand out a different session (fresh one, or the requested one vanished).
  useEffect(() => {
    if (!conv.assigned) return
    awaitingServerSession.current = false
    navigate(`/conversacion/${conv.assigned}`, { replace: true })
    void qc.invalidateQueries({ queryKey: ['sessions'] })
  }, [conv.assigned, navigate, qc])

  // Refresh the list when a chat is born and after each turn (the backend titles chats from the first message).
  const prevTurn = useRef(state.activeTurn)
  useEffect(() => {
    if (prevTurn.current && !state.activeTurn) void qc.invalidateQueries({ queryKey: ['sessions'] })
    prevTurn.current = state.activeTurn
  }, [state.activeTurn, qc])

  const selectChat = useCallback((id: string) => {
    setDrawer(false)
    if (id === routeId) return
    if (busy || voice.playing) voice.interrupt()
    qc.setQueryData(['notifications', id], [])
    navigate(`/conversacion/${id}`)
  }, [routeId, busy, voice, navigate, qc])

  const newChat = useCallback(async () => {
    setDrawer(false)
    setCreateError(null)
    if (busy || voice.playing) voice.interrupt()
    setCreating(true)
    try {
      const s = await createSession()
      await qc.invalidateQueries({ queryKey: ['sessions'] })
      navigate(`/conversacion/${s.id}`)
    } catch {
      // Older backend without POST /api/sessions: let the socket open a fresh session.
      awaitingServerSession.current = true
      conv.newSession()
      navigate('/conversacion')
    } finally {
      setCreating(false)
    }
  }, [busy, voice, qc, navigate, conv])

  const onRemoved = useCallback((id: string) => {
    if (id !== routeId) return
    const next = sessions.find((s) => s.id !== id)
    if (next) navigate(`/conversacion/${next.id}`, { replace: true })
    else void newChat()
  }, [routeId, sessions, navigate, newChat])

  // ---- Keyboard: Escape cuts the agent off, like speaking over it ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (voice.playing || busy)) voice.interrupt()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [voice, busy])

  // Fit the view to the viewport below whatever chrome sits above it (topbar, mobile rack).
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const fit = () => el.style.setProperty('--cv-top', `${Math.max(0, el.getBoundingClientRect().top + window.scrollY)}px`)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Best effort: chats other than the open one that hold undelivered notifications.
  const activeId = routeId ?? state.sessionId
  const others = sessions.filter((s) => s.id !== activeId).slice(0, 8)
  const unreadQs = useQueries({
    queries: others.map((s) => ({
      queryKey: ['notifications', s.id],
      queryFn: () => listNotifications(s.id),
      staleTime: 30_000, refetchInterval: 60_000, retry: false, refetchIntervalInBackground: false,
    })),
  })
  const unread = new Set(others.filter((_, i) => unreadQs[i]?.data?.some((n) => !n.delivered_at)).map((s) => s.id))

  const activeChat = sessions.find((s) => s.id === (routeId ?? state.sessionId))
  const title = activeChat?.title ?? UNTITLED
  const offline = state.connection !== 'open'

  return (
    <div className="cv" ref={rootRef}>
      <h1 className="sr-only">Conversación</h1>

      <ChatList
        sessions={sessions.filter((s) => s.message_count > 0 || s.id === routeId || s.title)}
        loading={sessionsQ.isLoading}
        error={sessionsQ.error}
        onRetry={() => void sessionsQ.refetch()}
        activeId={routeId ?? state.sessionId}
        onSelect={selectChat}
        onNew={() => void newChat()}
        creating={creating}
        onRemoved={onRemoved}
        narrow={narrow}
        open={drawer}
        onClose={() => setDrawer(false)}
        unread={unread}
      />

      <section className="cv-chat" aria-label="Chat">
        <header className="cv-head">
          {narrow && (
            <button type="button" className="cmp-btn cmp-ghost" aria-label="Abrir lista de chats" aria-expanded={drawer} onClick={() => setDrawer(true)}>
              <IconChats size={18} />
            </button>
          )}
          <span className="cv-link" data-state={state.connection} title={CONNECTION_LABEL[state.connection]}>
            <span className="led" aria-hidden="true" />
            <span className="sr-only">{CONNECTION_LABEL[state.connection]}</span>
          </span>
          <h2 className={`cv-title${activeChat?.title ? '' : ' is-untitled'}`} title={title}>{title}</h2>
          <CaseChip sessionId={activeId} live={state.caseView} />
          <span className="cv-chip" data-state={shown} data-voice={voiceOn || undefined}>
            <span className="cv-chip-led" aria-hidden="true" />
            {voiceOn ? `Voz · ${VOICE_LABELS[shown]}` : offline ? CONNECTION_LABEL[state.connection] : VOICE_LABELS[shown]}
          </span>
          {narrow && (
            <button type="button" className="cmp-btn cmp-ghost cv-head-new" aria-label="Nuevo chat" onClick={() => void newChat()} disabled={creating}>
              <IconCompose size={18} />
            </button>
          )}
        </header>

        <ChatSurface
          conv={conv}
          voice={voice}
          sessionId={activeId}
          live={live}
          offline={offline}
          onNewChat={() => void newChat()}
          creating={creating}
          extraError={createError}
          onClearExtraError={() => setCreateError(null)}
        />
      </section>
    </div>
  )
}
