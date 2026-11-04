import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconBars, IconGear, IconLayers, IconPulse, IconTicket, IconWave, TramaMark } from '../shared/ui/icons'
import { IconUsers } from '../features/technicians/icons'
import { ThemeToggle } from './theme'
import { AssistantLinkContext, type AssistantLink } from '../features/assistant/AssistantContext'
import { FloatingAssistant, type AssistantMode } from '../features/assistant/FloatingAssistant'
import { useVoiceSettings } from '../features/conversation/useVoiceSettings'
import { useWakeWord, type WakeStatus } from '../features/conversation/useWakeWord'

const WAKE_PAUSE_KEY = 'trama.wake_paused'
const readPaused = () => { try { return sessionStorage.getItem(WAKE_PAUSE_KEY) === '1' } catch { return false } }
const WAKE_LABEL: Record<WakeStatus | 'busy' | 'paused', string> = {
  off: 'Escucha desactivada', checking: 'Verificando modelo de activación…', loading: 'Cargando modelo de activación…',
  listening: 'Escuchando “{phrase}”. Pulse para pausar.', missing: 'Modelo de activación no instalado (npm run fetch:vosk)',
  error: 'No se pudo activar la escucha', busy: 'Micrófono en uso por el modo voz', paused: 'Escucha en pausa. Pulse para reanudar.',
}

export const NAV: { to: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { to: '/conversacion', label: 'Conversación', icon: IconWave },
  { to: '/diagnostico', label: 'Diagnóstico', icon: IconPulse },
  { to: '/tickets', label: 'Tickets', icon: IconTicket },
  { to: '/tecnicos', label: 'Técnicos', icon: IconUsers },
  { to: '/conocimiento', label: 'Conocimiento', icon: IconLayers },
  { to: '/metricas', label: 'Métricas', icon: IconBars },
]

const CONFIG = { to: '/configuracion', label: 'Configuración' }

export function Layout() {
  const { pathname } = useLocation()
  const current = [...NAV, CONFIG].find((n) => pathname.startsWith(n.to))
  const onChatRoute = pathname.startsWith('/conversacion')

  // ---- Floating assistant + wake word (one microphone consumer at a time) ----
  const settings = useVoiceSettings()
  const [mode, setMode] = useState<AssistantMode>('min')
  const [wakeNonce, setWakeNonce] = useState(0)
  const [chatVoice, setChatVoice] = useState(false)
  const [panelVoice, setPanelVoice] = useState(false)
  const [paused, setPaused] = useState(readPaused)
  const chatWake = useRef<(() => void) | null>(null)
  const onChatRef = useRef(onChatRoute)
  onChatRef.current = onChatRoute
  const link = useMemo<AssistantLink>(() => ({
    setChatVoiceActive: setChatVoice,
    setChatWakeHandler: (fn) => { chatWake.current = fn },
  }), [])
  const micBusy = chatVoice || panelVoice
  const wake = useWakeWord({
    phrase: settings.wakeWord.phrase,
    armed: settings.wakeWord.enabled && !paused,
    voiceActive: micBusy,
    onWake: () => {
      if (onChatRef.current && chatWake.current) chatWake.current() // Conversación: voice mode in that chat
      else setWakeNonce((n) => n + 1)                                  // elsewhere: open the panel with voice
    },
  })
  const togglePaused = () => setPaused((p) => {
    try { sessionStorage.setItem(WAKE_PAUSE_KEY, p ? '0' : '1') } catch { /* private mode */ }
    return !p
  })
  const wakeState = micBusy ? 'busy' : paused ? 'paused' : wake.status
  const toggleAssistant = useCallback(() => setMode((m) => (m === 'open' ? 'min' : 'open')), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (onChatRef.current) return
        e.preventDefault()
        toggleAssistant()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleAssistant])
  return (
    <AssistantLinkContext.Provider value={link}>
    <div className="shell">
      <aside className="rack">
        <div className="rack-brand">
          <TramaMark size={30} className="rack-mark" />
          <div className="rack-brand-text">
            <span className="brand-word">TRAMA</span>
            <span className="brand-sub">agente de red</span>
          </div>
        </div>
        <nav aria-label="Principal" className="rack-nav">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} title={n.label} className={({ isActive }) => `rack-link${isActive ? ' active' : ''}`}>
              <span className="rack-led" aria-hidden="true" />
              <n.icon size={18} />
              <span className="rack-label">{n.label}</span>
              <span className="rack-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="crumb">
            <span className="crumb-root">TRAMA</span>
            <span className="crumb-sep" aria-hidden="true">/</span>
            <span className="crumb-here">{current?.label ?? 'Inicio'}</span>
          </div>
          <div className="topbar-tools">
            {settings.wakeWord.enabled && (
              <button
                type="button" className="wake-ind" data-state={wakeState} onClick={togglePaused}
                aria-pressed={!paused} disabled={micBusy}
                title={(wake.error && !paused && !micBusy ? wake.error : WAKE_LABEL[wakeState]).replace('{phrase}', settings.wakeWord.phrase)}
                aria-label={`Escucha por voz: ${paused ? 'en pausa' : 'activa'}`}
              >
                <span className="led" aria-hidden="true" />
                <span>Mic</span>
              </button>
            )}
            <NavLink
              to={CONFIG.to}
              aria-label={CONFIG.label}
              title={CONFIG.label}
              className={({ isActive }) => `theme-toggle${isActive ? ' is-active' : ''}`}
            >
              <IconGear size={17} />
            </NavLink>
            <ThemeToggle />
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      <FloatingAssistant mode={mode} setMode={setMode} hidden={onChatRoute} wakeNonce={wakeNonce} onVoiceBusy={setPanelVoice} />
    </div>
    </AssistantLinkContext.Provider>
  )
}
