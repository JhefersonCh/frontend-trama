import { useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from 'react'
import { ACCEPT_ATTR, fmtBytes } from '../../shared/api/media'
import { IconClose, IconMic } from '../../shared/ui'
import { Progress } from '../../shared/ui/Progress'
import { IconArrowUp, IconAudioFile, IconKeyboard, IconPaperclip, IconStop } from './glyphs'
import type { Attachment } from './useAttachment'
import { VOICE_LABELS, VoiceGlyph, type VoiceState } from './VoiceStateIndicator'

const MAX_TEXTAREA_PX = 200

export interface ComposerAttach {
  att: Attachment | null
  onPick: (file: File) => void
  onClear: () => void
}

export interface ComposerVoice {
  /** Voice bar visible (voice mode on, starting, or a dev preview). */
  active: boolean
  starting: boolean
  state: VoiceState
  detail?: string
  userSpeaking: boolean
  canInterrupt: boolean
  levelRef: Ref<SVGCircleElement>
  keyboard: boolean
  onToggleKeyboard: () => void
  onStart: () => void
  onStop: () => void
  onInterrupt: () => void
}

/**
 * One composer, two modes. Text: textarea + mic + send/stop.
 * Voice: the same box becomes a live voice bar; the textarea stays one click away.
 */
export function Composer({ draft, onDraft, onSend, busy, onStop, voice, menu, inputRef, placeholder, attach }: {
  draft: string
  onDraft: (v: string) => void
  onSend: () => void
  busy: boolean
  onStop: () => void
  voice: ComposerVoice
  menu: ReactNode
  inputRef: RefObject<HTMLTextAreaElement | null>
  placeholder: string
  attach?: ComposerAttach
}) {
  const showText = !voice.active || voice.keyboard
  const att = attach?.att ?? null
  const photoReady = att?.kind === 'image' && att.status === 'ready'
  const attBusy = !!att && (att.status === 'uploading' || att.status === 'consent')
  const canSend = (draft.trim().length > 0 || photoReady) && !attBusy
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const takeFiles = (files: FileList | null | undefined) => {
    const f = files?.[0]
    if (f && attach) attach.onPick(f)
  }
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'))
    if (f && attach) { e.preventDefault(); attach.onPick(f) }
  }
  const onDrop = (e: DragEvent<HTMLFormElement>) => {
    if (!attach || !e.dataTransfer?.files?.length) return
    e.preventDefault()
    setDragging(false)
    takeFiles(e.dataTransfer.files)
  }

  // Auto-grow: measure on every change, capped (then it scrolls).
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`
  }, [draft, showText, inputRef])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }

  return (
    <form
      className="composer"
      data-mode={voice.active ? 'voice' : 'text'}
      data-drop={dragging || undefined}
      onSubmit={(e) => { e.preventDefault(); if (canSend) onSend() }}
      onDragOver={(e) => { if (attach && e.dataTransfer?.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }}
      onDrop={onDrop}
    >
      {voice.active && <VoiceBar voice={voice} />}
      {att && <AttachmentChip att={att} onClear={attach!.onClear} />}

      {showText && (
        <div className="cmp-row" key={voice.active ? 'kbd' : 'text'}>
          {!voice.active && menu}
          {attach && (
            <>
              <button
                type="button"
                className="cmp-btn cmp-ghost"
                aria-label="Adjuntar foto o audio"
                title="Adjuntar foto (JPG, PNG, WebP) o audio"
                disabled={attBusy}
                onClick={() => fileRef.current?.click()}
              >
                <IconPaperclip size={18} />
              </button>
              <input
                ref={fileRef} type="file" accept={ACCEPT_ATTR} hidden tabIndex={-1} aria-hidden="true"
                onChange={(e) => { takeFiles(e.target.files); e.target.value = '' }}
              />
            </>
          )}
          <textarea
            ref={inputRef}
            className="cmp-input"
            rows={1}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={photoReady ? 'Agregue un comentario (opcional)…' : placeholder}
            aria-label="Mensaje"
            autoComplete="off"
          />
          {!voice.active && (
            <button
              type="button"
              className="cmp-btn cmp-mic"
              aria-label="Activar modo voz"
              title="Activar modo voz"
              aria-pressed={false}
              onClick={voice.onStart}
            >
              <IconMic size={19} />
            </button>
          )}
          {busy && !voice.active ? (
            <button type="button" className="cmp-btn cmp-stop" aria-label="Interrumpir" title="Interrumpir (Esc)" onClick={onStop}>
              <IconStop size={16} />
            </button>
          ) : (
            <button type="submit" className="cmp-btn cmp-send" aria-label="Enviar" title="Enviar (Enter)" disabled={!canSend}>
              <IconArrowUp size={18} />
            </button>
          )}
        </div>
      )}
    </form>
  )
}

const STATUS_TEXT = { uploading: 'Subiendo', consent: 'Esperando su permiso', ready: 'Listo', error: 'No se pudo adjuntar' } as const

function AttachmentChip({ att, onClear }: { att: Attachment; onClear: () => void }) {
  const isImage = att.kind === 'image'
  return (
    <div className="att" data-status={att.status} role="group" aria-label={`Adjunto: ${att.file.name}`}>
      <span className="att-thumb" aria-hidden="true">
        {att.preview ? <img src={att.preview} alt="" /> : <IconAudioFile size={20} />}
      </span>
      <span className="att-main">
        <span className="att-top">
          <span className="att-name" title={att.file.name}>{att.file.name}</span>
          <span className="att-size">{fmtBytes(att.file.size)}</span>
        </span>
        {att.status === 'uploading' ? (
          <Progress value={att.progress} label={`Subiendo ${isImage ? 'imagen' : 'audio'}`} indeterminate={att.progress >= 0.999} />
        ) : (
          <span className="att-msg" role={att.status === 'error' ? 'alert' : 'status'}>
            <span className="att-led" aria-hidden="true" />{att.message ?? STATUS_TEXT[att.status]}
          </span>
        )}
      </span>
      <button type="button" className="cmp-btn cmp-ghost att-x" aria-label="Quitar adjunto" title="Quitar adjunto" onClick={onClear}>
        <IconClose size={15} />
      </button>
    </div>
  )
}

function VoiceBar({ voice }: { voice: ComposerVoice }) {
  const label = voice.starting ? 'Abriendo micrófono' : VOICE_LABELS[voice.state]
  const sub = voice.starting
    ? 'Permita el acceso al micrófono si el navegador lo pide.'
    : voice.state === 'listening'
      ? voice.userSpeaking ? 'Lo escucho…' : 'Hable cuando quiera.'
      : voice.state === 'speaking'
        ? 'Hable encima para interrumpir.'
        : voice.detail ?? ''

  return (
    <div className="vbar" data-state={voice.starting ? 'starting' : voice.state}>
      <VoiceGlyph state={voice.starting ? 'loading_model' : voice.state} levelRef={voice.levelRef} />
      <div className="vbar-text" role="status" aria-live="polite">
        <span className="vbar-label">{label}</span>
        {sub && <span className="vbar-sub">{sub}</span>}
      </div>
      <div className="vbar-tools">
        {voice.canInterrupt && (
          <button type="button" className="vbar-int" onClick={voice.onInterrupt} aria-label="Interrumpir">
            <IconStop size={13} /><span>Interrumpir</span>
          </button>
        )}
        <button
          type="button"
          className="cmp-btn cmp-ghost"
          aria-label={voice.keyboard ? 'Ocultar teclado' : 'Escribir un mensaje'}
          title={voice.keyboard ? 'Ocultar teclado' : 'Escribir un mensaje'}
          aria-pressed={voice.keyboard}
          onClick={voice.onToggleKeyboard}
        >
          <IconKeyboard size={18} />
        </button>
        <button
          type="button"
          className="cmp-btn cmp-end"
          aria-label="Salir del modo voz"
          title="Salir del modo voz"
          onClick={voice.onStop}
        >
          <IconClose size={17} />
        </button>
      </div>
    </div>
  )
}
