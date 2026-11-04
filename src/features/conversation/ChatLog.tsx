import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationBadge } from '../../shared/api/notifications'
import { mediaUrl } from '../../shared/api/media'
import { loadSessionId, type SourceItem, type TurnMetrics } from '../../shared/api/ws'
import { GenUiBlock } from '../genui/GenUiBlock'
import type { EmitOptions, GenUiEnv } from '../genui/types'
import { IconAlert, IconMic, Loading, TramaMark } from '../../shared/ui'
import type { ChatEntry, ToolEntry } from './conversationReducer'
import { ConfirmCard } from './ConfirmCard'
import { IconArrowDown } from './glyphs'
import { RichText } from './rich'
import { VOICE_LABELS, VoiceOrb, type VoiceState } from './VoiceStateIndicator'

export const EXAMPLES = [
  'El Wi-Fi del laboratorio conecta pero no navega',
  'Mi equipo no recibe dirección IP (DHCP)',
  'Las páginas no cargan por nombre, ¿es el DNS?',
]

/** Distance from the bottom (px) under which the log keeps following new content. */
const STICK_PX = 64

type UiEntry = Extract<ChatEntry, { kind: 'ui' }>
export type UiEventHandler = (entry: UiEntry, action: string, payload: Record<string, unknown>, opts?: EmitOptions) => boolean

export function ChatLog({ entries, busy, liveState, loading, onExample, progress, onConfirm, onUiEvent, sessionId = null, activeTurn = null }: {
  entries: ChatEntry[]
  busy: boolean
  /** Live pipeline state; drives the "waiting for the reply" row and the empty-state orb. */
  liveState: VoiceState
  loading: boolean
  onExample: (text: string) => void
  /** Transient status message of the running turn. */
  progress: string | null
  onConfirm: (entry: Extract<ChatEntry, { kind: 'confirm' }>, accepted: boolean) => void
  /** Interaction with a generative component (absent → components render read-only). */
  onUiEvent?: UiEventHandler
  sessionId?: string | null
  activeTurn?: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const lastCount = useRef(entries.length)
  const [unseen, setUnseen] = useState(false)

  const last = entries[entries.length - 1]
  // A turn is running but the assistant has not produced anything for it yet.
  // A component the person just used also leaves the chat waiting for the reply.
  const answered = !!activeTurn && entries.some((e) => (e.kind === 'assistant' || e.kind === 'ui') && e.turnId === activeTurn)
  const waiting = busy && (!last || last.kind === 'user' || (last.kind === 'ui' && !answered))
  // Progress replaces the generic label; if the assistant already has an (empty) entry, it shows as a line beneath it.
  const status = busy && !!progress && !waiting && last?.kind === 'assistant' && !last.text ? progress : null

  // Follow the stream only while the reader is at the bottom; a message the user just sent always scrolls.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const grew = entries.length > lastCount.current
    lastCount.current = entries.length
    if (grew && last?.kind === 'user' && !last.pending && last.via === 'text') stick.current = true
    if (stick.current) {
      el.scrollTop = el.scrollHeight
      setUnseen(false)
    } else if (grew || last?.kind === 'assistant') {
      setUnseen(true)
    }
  }, [entries, waiting, last, progress])

  useEffect(() => {
    if (!loading && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [loading])

  const toBottom = () => {
    const el = ref.current
    if (!el) return
    stick.current = true
    setUnseen(false)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }

  const empty = entries.length === 0 && !waiting

  return (
    <div className="cv-logwrap">
      <div
        ref={ref}
        className="cv-log"
        role="log"
        aria-live="polite"
        aria-busy={busy || loading}
        aria-label="Mensajes del chat"
        tabIndex={empty ? -1 : 0}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX
          if (stick.current) setUnseen(false)
        }}
      >
        <div className="cv-col">
          {loading && entries.length === 0 ? (
            <div className="cv-loading"><Loading label="Cargando conversación…" /></div>
          ) : empty ? (
            <EmptyState state={liveState} onExample={onExample} />
          ) : (
            <ol className="msgs">
              {entries.filter((e) => !isBlankTurn(e)).map((e) => (
                <li key={e.id} className={`msg msg-${e.kind}`}>
                  {e.kind === 'user' && <UserMsg entry={e} />}
                  {e.kind === 'assistant' && <AssistantMsg entry={e} />}
                  {e.kind === 'confirm' && <ConfirmCard entry={e} onAnswer={(ok) => onConfirm(e, ok)} />}
                  {e.kind === 'ui' && <UiMsg entry={e} onUiEvent={onUiEvent} sessionId={sessionId} />}
                  {e.kind === 'error' && (
                    <div className="msg-err" role="alert">
                      <IconAlert size={15} />
                      <span>{e.detail}</span>
                    </div>
                  )}
                </li>
              ))}
              {waiting && (
                <li className="msg msg-assistant msg-waiting">
                  <AssistantHead />
                  <p className="waiting" data-state={liveState}>
                    <span className="waiting-led" aria-hidden="true" />
                    {progress ?? `${liveState === 'idle' ? 'Enviando' : VOICE_LABELS[liveState]}…`}
                  </p>
                </li>
              )}
              {status && (
                <li className="msg msg-status">
                  <p className="waiting" data-state={liveState}>
                    <span className="waiting-led" aria-hidden="true" />{status}
                  </p>
                </li>
              )}
            </ol>
          )}
        </div>
      </div>

      <button
        type="button"
        className="cv-newpill"
        data-show={unseen || undefined}
        aria-hidden={!unseen}
        tabIndex={unseen ? 0 : -1}
        onClick={toBottom}
      >
        <IconArrowDown size={14} />Nuevos mensajes
      </button>
    </div>
  )
}

/** A finished assistant turn that produced nothing visible (e.g. it ended in an error entry). */
function isBlankTurn(e: ChatEntry) {
  return e.kind === 'assistant' && !e.streaming && !e.text && e.tools.length === 0 && e.sources.length === 0 && !e.interrupted
}

function EmptyState({ state, onExample }: { state: VoiceState; onExample: (text: string) => void }) {
  return (
    <div className="cv-empty">
      <div className={`cv-empty-orb voice voice-${state}`} aria-hidden="true">
        <VoiceOrb />
        <TramaMark size={26} className="cv-empty-mark" />
      </div>
      <h2 className="cv-empty-title">¿Qué está fallando en la red?</h2>
      <p className="cv-empty-sub">
        Escríbalo o active el micrófono y cuéntelo como a alguien de soporte. TRAMA razona sobre Wi-Fi, DHCP y DNS.
      </p>
      <ul className="cv-examples" aria-label="Ejemplos">
        {EXAMPLES.map((x) => (
          <li key={x}><button type="button" className="cv-example" onClick={() => onExample(x)}>{x}</button></li>
        ))}
      </ul>
    </div>
  )
}

function AssistantHead({ interrupted, badge }: { interrupted?: boolean; badge?: string }) {
  return (
    <span className="msg-who">
      <TramaMark size={16} className="msg-mark" />TRAMA
      {interrupted && <span className="msg-cut">interrumpido</span>}
      {badge && <span className="msg-badge">{badge}</span>}
    </span>
  )
}

function UiMsg({ entry, onUiEvent, sessionId }: { entry: UiEntry; onUiEvent?: UiEventHandler; sessionId: string | null }) {
  const env = useMemo<GenUiEnv>(() => ({
    emit: (action, payload = {}, opts) => onUiEvent?.(entry, action, payload, opts) ?? false,
    sessionId,
    interactive: !!onUiEvent,
  }), [entry, onUiEvent, sessionId])
  return <GenUiBlock id={entry.componentId} component={entry.component} props={entry.props} fallbackText={entry.fallbackText} answer={entry.answer} env={env} />
}

function UserMsg({ entry }: { entry: Extract<ChatEntry, { kind: 'user' }> }) {
  return (
    <>
      {entry.media && <UserPhoto url={entry.media.url} />}
      {(entry.pending || entry.text || !entry.media) && (
        <p className={`bubble${entry.pending ? ' is-pending' : ''}`}>
          {entry.pending ? <span className="muted">Transcribiendo…</span> : entry.text}
        </p>
      )}
      {entry.via === 'voice' && <span className="msg-via"><IconMic size={11} />voz</span>}
    </>
  )
}

function UserPhoto({ url }: { url: string }) {
  const [broken, setBroken] = useState(false)
  // History rows carry the served URL (needs the owning session); live ones a local preview.
  const src = url.startsWith('/api/') ? mediaUrl(url, loadSessionId()) : url
  if (broken) return <p className="bubble bubble-photo-missing">Foto adjunta (no disponible)</p>
  return (
    <figure className="bubble-photo">
      <img src={src} alt="Foto adjunta" loading="lazy" onError={() => setBroken(true)} />
    </figure>
  )
}

function AssistantMsg({ entry }: { entry: Extract<ChatEntry, { kind: 'assistant' }> }) {
  return (
    <>
      <AssistantHead interrupted={entry.interrupted} badge={entry.notification ? notificationBadge(entry.notification.kind) : undefined} />
      {entry.tools.length > 0 && <Tools tools={entry.tools} />}
      {(entry.text || entry.streaming) && (
        <p className="answer">
          <RichText text={entry.text} />
          {entry.streaming && <span className="caret" aria-hidden="true" />}
        </p>
      )}
      {entry.sources.length > 0 && <Sources items={entry.sources} />}
      {entry.metrics && <Metrics m={entry.metrics} />}
    </>
  )
}

function formatArgs(args: unknown): string {
  if (args === undefined || args === null) return ''
  if (typeof args === 'string') return args
  try { return JSON.stringify(args) } catch { return String(args) }
}

/** All tool calls of a turn as one collapsible mono log row. */
function Tools({ tools }: { tools: ToolEntry[] }) {
  const running = tools.some((t) => !t.result)
  const failed = tools.some((t) => t.result && !t.result.ok)
  const state = running ? 'run' : failed ? 'fail' : 'ok'
  return (
    <details className={`tools tool-${state}`}>
      <summary>
        <span className="tool-op">CALL×{tools.length}</span>
        <span className="tool-names">{tools.map((t) => t.name).join(' · ')}</span>
        <span className="tool-res">{running ? '…' : failed ? 'ERR' : 'OK'}</span>
      </summary>
      <ul className="tool-lines">
        {tools.map((t, i) => {
          const args = formatArgs(t.arguments)
          const res = t.result
          return (
            <li key={i} className={`tool-line tool-${!res ? 'run' : res.ok ? 'ok' : 'fail'}`}>
              <span className="tool-sig"><span className="tool-name">{t.name}</span>({args})</span>
              <span className="tool-res">{!res ? '…' : res.ok ? 'OK' : 'ERR'}</span>
              {res?.summary && <span className="tool-sum">{res.summary}</span>}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function Sources({ items }: { items: SourceItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open === null) return
    const onDown = (e: MouseEvent) => { if (!listRef.current?.contains(e.target as Node)) setOpen(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <ul className="cites" aria-label="Fuentes" ref={listRef}>
      {items.map((s, i) => {
        const isOpen = open === i
        const pid = `cite-pop-${i}`
        return (
          <li
            key={`${s.source_uri}-${i}`}
            className={`cite${s.is_synthetic ? ' is-synthetic' : ''}`}
            onKeyDown={(e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); setOpen(null); (e.currentTarget.querySelector('.cite-btn') as HTMLElement | null)?.focus() } }}
          >
            <button type="button" className="cite-btn" aria-expanded={isOpen} aria-controls={isOpen ? pid : undefined} onClick={() => setOpen(isOpen ? null : i)}>
              <span className="cite-n">[{i + 1}]</span>
              <span className="cite-title">{s.title || s.source_uri}</span>
              {s.section && <span className="cite-sec">§ {s.section}</span>}
              {s.is_synthetic && <span className="cite-syn">sintético</span>}
            </button>
            {isOpen && <CitePopover id={pid} s={s} onClose={() => setOpen(null)} />}
          </li>
        )
      })}
    </ul>
  )
}

function CitePopover({ id, s, onClose }: { id: string; s: SourceItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const href = s.document_id ? `/conocimiento/${s.document_id}${s.chunk_index != null ? `?chunk=${s.chunk_index}` : ''}` : null
  const external = s.source_uri && /^https?:\/\//.test(s.source_uri) ? s.source_uri : null
  return (
    <div ref={ref} id={id} className="cite-pop" role="dialog" aria-label={`Fuente: ${s.title}`} tabIndex={-1}>
      <p className="cite-pop-title">{s.title}</p>
      <p className="cite-pop-meta">
        {s.section && <span>§ {s.section}</span>}
        {s.is_synthetic && <span className="cite-syn">sintético</span>}
        {typeof s.score === 'number' && <span className="mono">relevancia {Math.round(s.score * 100)}%</span>}
      </p>
      {s.excerpt
        ? <blockquote className="cite-pop-excerpt">{s.excerpt}</blockquote>
        : <p className="cite-pop-excerpt is-empty">Esta fuente no incluye un extracto guardado.</p>}
      <div className="cite-pop-actions">
        {href && <Link className="btn btn-primary btn-sm" to={href} onClick={onClose}>Ver en el documento</Link>}
        {external && <a className="cite-pop-ext" href={external} target="_blank" rel="noreferrer noopener">Fuente original ↗</a>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}

const fmtMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`)

function Metrics({ m }: { m: TurnMetrics }) {
  const rows: [string, number | null | undefined][] = [
    ['STT', m.stt_ms], ['RAG', m.rag_ms], ['LLM', m.llm_first_token_ms], ['TTS', m.tts_first_audio_ms], ['Σ', m.total_ms],
  ]
  const shown = rows.filter((r): r is [string, number] => typeof r[1] === 'number' && Number.isFinite(r[1]))
  if (shown.length === 0) return null
  return (
    <dl className="metrics" aria-label="Tiempos del turno">
      {shown.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{fmtMs(v)}</dd></div>
      ))}
    </dl>
  )
}
