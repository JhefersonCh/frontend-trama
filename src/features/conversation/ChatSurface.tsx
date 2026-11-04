import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Banner, Button, Modal } from '../../shared/ui'
import { ChatLog, type UiEventHandler } from './ChatLog'
import { Composer } from './Composer'
import { ComposerMenu } from './ComposerMenu'
import { IconCompose } from './glyphs'
import { useAttachment } from './useAttachment'
import type { Conversation } from './useConversation'
import type { useVoiceMode } from './useVoiceMode'
import { VOICE_LABELS, type VoiceState } from './VoiceStateIndicator'

const STATES = Object.keys(VOICE_LABELS) as VoiceState[]

/** Live state: playback wins, then the server pipeline, then the open mic. */
export function liveVoiceState(state: Conversation['state'], voice: ReturnType<typeof useVoiceMode>): VoiceState {
  return voice.playing
    ? 'speaking'
    : state.serverState !== 'idle' && !(state.serverState === 'speaking' && voice.status !== 'on')
      ? state.serverState
      : voice.status === 'on'
        ? 'listening'
        : 'idle'
}

/**
 * Messages + composer (text, mic, voice mode, attachments, generative UI) of ONE conversation.
 * Shared by the full chat view and the floating assistant: all chat logic lives here and in the hooks.
 */
export function ChatSurface({ conv, voice, sessionId, live, offline, onNewChat, creating, extraError, onClearExtraError, className }: {
  conv: Conversation
  voice: ReturnType<typeof useVoiceMode>
  sessionId: string | null
  /** Live pipeline state (playback > server state > open mic). */
  live: VoiceState
  offline: boolean
  onNewChat?: () => void
  creating?: boolean
  extraError?: string | null
  onClearExtraError?: () => void
  className?: string
}) {
  const { state } = conv
  const [draft, setDraft] = useState('')
  const [keyboard, setKeyboard] = useState(false)
  const [preview, setPreview] = useState<VoiceState | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = state.activeTurn !== null
  const voiceOn = voice.status !== 'off'
  const devPreview = import.meta.env.DEV ? preview : null
  const shown = devPreview ?? live

  const attachment = useAttachment(sessionId, (text) => {
    setDraft((d) => (d.trim() ? `${d.trimEnd()} ${text}` : text))
    requestAnimationFrame(() => inputRef.current?.focus())
  })
  const att = attachment.att
  const clearAttachment = attachment.clear
  useEffect(() => { clearAttachment() }, [sessionId, clearAttachment]) // an upload belongs to the chat it was made in

  const send = (text: string) => {
    const t = text.trim()
    if (att?.kind === 'image' && att.status === 'ready' && att.upload) {
      conv.sendMedia(att.upload.media_id, t, att.preview ?? att.upload.url)
      attachment.clear(true)
    } else {
      if (!t) return
      conv.sendText(t)
      if (att && att.status !== 'uploading' && att.status !== 'consent') attachment.clear()
    }
    setDraft('')
    inputRef.current?.focus()
  }

  const onUiEvent = useCallback<UiEventHandler>((entry, action, payload, opts) => {
    if (!opts?.metric && (busy || voice.playing)) voice.interrupt()
    return conv.sendUiEvent(entry.id, entry.componentId, entry.component, action, payload, opts)
  }, [conv, busy, voice])

  let menu: ReactNode = null
  if (onNewChat || import.meta.env.DEV) {
    menu = (
      <ComposerMenu>
        {(close) => (
          <>
            {onNewChat && (
              <button type="button" className="cmenu-item" data-menu-first onClick={() => { close(); onNewChat() }} disabled={creating}>
                <IconCompose size={16} />Nuevo chat
              </button>
            )}
            {import.meta.env.DEV && (
              <label className="cmenu-item cmenu-dev">
                <span className="cmenu-tag">DEV</span>
                <select className="control control-sm" value={preview ?? ''} onChange={(e) => setPreview((e.target.value || null) as VoiceState | null)} aria-label="Forzar estado de voz">
                  <option value="">Estado en vivo</option>
                  {STATES.map((s) => <option key={s} value={s}>{VOICE_LABELS[s]}</option>)}
                </select>
              </label>
            )}
          </>
        )}
      </ComposerMenu>
    )
  }

  return (
    <>
      <ChatLog
        key={sessionId ?? 'none'}
        entries={state.entries}
        busy={busy}
        liveState={shown}
        loading={conv.historyLoading}
        onExample={send}
        progress={state.progress}
        onConfirm={(e, ok) => conv.answerConfirm(e.id, e.turnId, e.action, ok)}
        onUiEvent={onUiEvent}
        sessionId={sessionId}
        activeTurn={state.activeTurn}
      />
      {att?.status === 'consent' && (
        <Modal title="Analizar la imagen" onClose={() => attachment.clear()}>
          <div className="consent">
            {att.preview && <img className="consent-img" src={att.preview} alt="Imagen que se enviará" />}
            <p>La imagen se enviará a un servicio externo para analizarla y detectar las luces del equipo.</p>
            <p className="consent-warn">Revise que no muestre contraseñas de Wi-Fi ni otros datos personales antes de continuar.</p>
            <div className="consent-actions">
              <Button variant="ghost" onClick={() => attachment.clear()}>Cancelar</Button>
              <Button variant="primary" onClick={attachment.acceptConsent}>Enviar para análisis</Button>
            </div>
          </div>
        </Modal>
      )}

      <div className={`cv-dock${className ? ` ${className}` : ''}`}>
        <div className="cv-dock-col">
          {voice.error && <Banner tone="error" onClose={voice.clearError}>{voice.error}</Banner>}
          {extraError && <Banner tone="error" onClose={onClearExtraError}>{extraError}</Banner>}
          <Composer
            draft={draft}
            onDraft={setDraft}
            onSend={() => send(draft)}
            busy={busy}
            onStop={voice.interrupt}
            inputRef={inputRef}
            attach={{ att, onPick: (f) => void attachment.pick(f), onClear: () => attachment.clear() }}
            placeholder={voiceOn ? 'Escriba mientras habla…' : 'Describa el problema de red…'}
            voice={{
              active: voiceOn || devPreview !== null,
              starting: voice.status === 'starting',
              state: shown,
              detail: state.serverState === 'loading_model' || state.serverState === 'retrieving' ? state.stateDetail : undefined,
              userSpeaking: voice.userSpeaking,
              canInterrupt: voice.playing || busy || devPreview === 'speaking',
              levelRef: voice.levelEl,
              keyboard,
              onToggleKeyboard: () => {
                setKeyboard((k) => !k)
                requestAnimationFrame(() => inputRef.current?.focus())
              },
              onStart: () => { setKeyboard(false); void voice.start() },
              onStop: () => { setPreview(null); void voice.stop() },
              onInterrupt: voice.interrupt,
            }}
            menu={menu}
          />
          <p className="cv-hint" aria-live="polite">
            {offline
              ? state.connection === 'reconnecting' ? 'Sin conexión con el agente: reintentando. Lo que envíes saldrá al reconectar.' : 'Conectando con el agente…'
              : voiceOn ? 'Modo voz activo · el micrófono se cierra al salir.' : busy ? 'Respondiendo · Esc para interrumpir.' : 'Enter envía · Shift+Enter nueva línea'}
          </p>
        </div>
      </div>
    </>
  )
}
