import { useRef, useState, type KeyboardEvent } from 'react'
import { GuFrame } from './parts'
import type { QuickRepliesProps } from './schema'
import type { GenUiComponentProps } from './types'

/**
 * Answer chips. Roving focus with arrows/Home/End; digits 1–9 pick an option while focus is inside.
 * After a pick the chips lock (the block then collapses to its "respondido" row).
 */
export function QuickReplies({ id, props, env }: GenUiComponentProps<QuickRepliesProps>) {
  const [picked, setPicked] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [free, setFree] = useState('')
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const locked = picked !== null || !env.interactive

  const choose = (value: string, label: string) => {
    if (locked) return
    setPicked(value)
    if (!env.emit('quick_reply', { fact: props.fact, value }, { answer: label })) setPicked(null)
  }

  const focusAt = (i: number) => {
    const n = props.options.length
    const next = (i + n) % n
    setActive(next)
    refs.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focusAt(active + 1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focusAt(active - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0) }
    else if (e.key === 'End') { e.preventDefault(); focusAt(props.options.length - 1) }
    else if (/^[1-9]$/.test(e.key)) {
      const o = props.options[Number(e.key) - 1]
      if (o) { e.preventDefault(); choose(o.value, o.label) }
    }
  }

  const qid = `${id}-q`
  return (
    <GuFrame component="quick_replies" eyebrow="Respuesta rápida" label={props.question || 'Respuesta rápida'}>
      {props.question && <p className="gu-question" id={qid}>{props.question}</p>}
      <div className="qr" role="toolbar" aria-labelledby={props.question ? qid : undefined} aria-label={props.question ? undefined : 'Opciones'} onKeyDown={onKeyDown}>
        {props.options.map((o, i) => (
          <button
            key={`${o.value}-${i}`}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            className="qr-chip"
            style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}
            tabIndex={i === active ? 0 : -1}
            aria-pressed={picked === o.value}
            disabled={locked && picked !== o.value}
            onFocus={() => setActive(i)}
            onClick={() => choose(o.value, o.label)}
          >
            {i < 9 && <kbd className="qr-key" aria-hidden="true">{i + 1}</kbd>}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      {props.allow_free_text && env.interactive && (
        <form
          className="qr-free"
          onSubmit={(e) => { e.preventDefault(); const t = free.trim(); if (t) choose(t, t) }}
        >
          <input
            className="control control-sm"
            value={free}
            onChange={(e) => setFree(e.target.value)}
            placeholder="Otra respuesta…"
            aria-label="Escribir otra respuesta"
            disabled={locked}
            maxLength={200}
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={locked || !free.trim()}>Responder</button>
        </form>
      )}
    </GuFrame>
  )
}
