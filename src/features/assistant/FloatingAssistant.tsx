import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createSession } from '../../shared/api/sessions'
import { TramaMark } from '../../shared/ui/icons'
import { ChatSurface, liveVoiceState } from '../conversation/ChatSurface'
import { useConversation, type SessionStore } from '../conversation/useConversation'
import { useVoiceMode } from '../conversation/useVoiceMode'
import { useVoiceSettings } from '../conversation/useVoiceSettings'
import { VOICE_LABELS } from '../conversation/VoiceStateIndicator'
import { pageContext } from './pageContext'
import '../conversation/conversation.css'
import './assistant.css'

export type AssistantMode = 'closed' | 'min' | 'open'

const KEY = 'trama.assistant_session_id'
const STORE: SessionStore = {
  load: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  save: (id) => { try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY) } catch { /* private mode */ } },
}

/**
 * Floating assistant. Same hooks and ChatSurface as the full chat, with its own session ("Asistente")
 * created lazily on first open. Lives in the Layout, so it survives navigation.
 */
export function FloatingAssistant({ mode, setMode, hidden, wakeNonce, onVoiceBusy }: {
  mode: AssistantMode
  setMode: (m: AssistantMode) => void
  /** On the Conversación route the full chat is already there. */
  hidden: boolean
  /** Bumped by the Layout when the wake word fires on another route: start voice mode here. */
  wakeNonce: number
  /** True while this panel holds (or is about to take) the microphone. */
  onVoiceBusy: (busy: boolean) => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const [sessionId, setSessionId] = useState<string | null>(() => STORE.load())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const everOpened = useRef(mode === 'open')
  if (mode === 'open') everOpened.current = true
  const wantSession = everOpened.current && !hidden

  // Lazy session: reuse the stored one, else create + title it.
  useEffect(() => {
    if (!wantSession || sessionId || creating) return
    setCreating(true)
    void (async () => {
      try {
        const s = await createSession()
        STORE.save(s.id)
        setSessionId(s.id)
      } catch {
        setCreateError('No se pudo abrir el asistente. Intente de nuevo en unos segundos.')
        setMode('min')
      } finally { setCreating(false) }
    })()
  }, [wantSession, sessionId, creating, setMode])

  const conv = useConversation(sessionId, {
    enabled: wantSession && !!sessionId, store: STORE, getContext: () => pageContext(pathRef.current),
  })
  // The server replaced the session (the stored one vanished): adopt the new one.
  useEffect(() => { if (conv.assigned) { STORE.save(conv.assigned); setSessionId(conv.assigned) } }, [conv.assigned])

  const settings = useVoiceSettings()
  const voice = useVoiceMode(conv, settings)
  // "Nuevo chat": the current session stays saved as a normal chat (the backend titles it); a fresh one starts.
  const newChat = () => {
    if (voice.status !== 'off') void voice.stop()
    STORE.save(null)
    conv.newSession() // rebinds the socket: the server mints a fresh session, adopted via conv.assigned
  }
  const live = liveVoiceState(conv.state, voice)
  const voiceOn = voice.status !== 'off'

  // Wake word elsewhere: open and start voice as soon as the socket is ready (so the first utterance is not lost).
  const [pending, setPending] = useState(false)
  const seen = useRef(wakeNonce)
  useEffect(() => {
    if (wakeNonce === seen.current) return
    seen.current = wakeNonce
    setPending(true)
    setMode('open')
  }, [wakeNonce, setMode])
  const online = conv.state.connection === 'open'
  useEffect(() => {
    if (!pending || !online || hidden) return
    setPending(false)
    if (voice.status === 'off') void voice.start()
  }, [pending, online, hidden, voice])

  // Mic arbitration: report ownership; release it when the panel is not on screen.
  useEffect(() => { onVoiceBusy(voiceOn || pending) }, [voiceOn, pending, onVoiceBusy])
  const visible = mode === 'open' && !hidden
  // Only on a real visible→hidden transition: the wake effect sets pending + opens in the same commit,
  // so clearing pending whenever !visible would cancel the wake-started voice before the panel opens.
  const wasVisible = useRef(visible)
  useEffect(() => {
    const was = wasVisible.current
    wasVisible.current = visible
    if (was && !visible) { setPending(false); if (voice.status !== 'off') void voice.stop() }
  }, [visible, voice])

  // Esc: cut the agent off first, then minimize.
  const busy = conv.state.activeTurn !== null
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (voice.playing || busy) voice.interrupt()
      else setMode('min')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, voice, busy, setMode])

  if (hidden || mode === 'closed') return null
  const open = mode === 'open'
  const offline = conv.state.connection !== 'open'

  return (
    <>
      {everOpened.current && (
        <section className="fa-panel" role="dialog" aria-label="Asistente TRAMA" hidden={!open}>
          <header className="fa-head">
            <TramaMark size={18} className="fa-mark" />
            <h2 className="fa-title">Asistente</h2>
            <span className="cv-chip fa-chip" data-state={live} data-voice={voiceOn || undefined}>
              <span className="cv-chip-led" aria-hidden="true" />
              {offline ? 'Conectando' : VOICE_LABELS[live]}
            </span>
            {sessionId && (
              <button type="button" className="fa-icon" aria-label="Abrir en el chat" title="Abrir en el chat" onClick={() => { setMode('min'); navigate(`/conversacion/${sessionId}`) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
              </button>
            )}
            <button type="button" className="fa-icon" aria-label="Nuevo chat" title="Nuevo chat (guarda este y empieza otro)" onClick={newChat} disabled={!sessionId}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button type="button" className="fa-icon" aria-label="Minimizar asistente" title="Minimizar (Esc)" onClick={() => setMode('min')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 18h14" /></svg>
            </button>
          </header>
          <div className="fa-body">
            {sessionId ? (
              <ChatSurface
                conv={conv}
                voice={voice}
                sessionId={sessionId}
                live={live}
                offline={offline}
                extraError={createError}
                onClearExtraError={() => setCreateError(null)}
              />
            ) : (
              <p className="fa-wait" role="status">Abriendo asistente…</p>
            )}
          </div>
        </section>
      )}
      {!open && (
        <button type="button" className="fa-orb" data-voice={voiceOn || undefined} aria-label="Abrir asistente (Ctrl+K)" title="Asistente · Ctrl+K" onClick={() => setMode('open')}>
          <TramaMark size={24} />
        </button>
      )}
    </>
  )
}
