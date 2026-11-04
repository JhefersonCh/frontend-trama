import { useState } from 'react'
import { GlyphMinus, GlyphPlus } from './icons'
import { GuFrame } from './parts'
import type { CompareProps } from './schema'
import type { GenUiComponentProps } from './types'

/** Two or three options side by side with pros and cons; choosing one is an answer. */
export function CompareCards({ props, env }: GenUiComponentProps<CompareProps>) {
  const [picked, setPicked] = useState<string | null>(null)
  const choose = (id: string, title: string) => {
    if (picked || !env.interactive) return
    setPicked(id)
    if (!env.emit('compare_choose', { option_id: id }, { answer: title })) setPicked(null)
  }
  return (
    <GuFrame component="compare_cards" eyebrow="Comparar opciones" label={props.question || 'Comparar opciones'}>
      {props.question && <p className="gu-question">{props.question}</p>}
      <div className="cmpc" data-count={props.options.length}>
        {props.options.map((o, i) => (
          <article key={o.id} className="cmpc-card" data-picked={picked === o.id || undefined} style={{ animationDelay: `${i * 50}ms` }}>
            <p className="cmpc-idx mono">{String.fromCharCode(65 + i)}</p>
            <h4 className="cmpc-title">{o.title}</h4>
            {o.summary && <p className="cmpc-sum">{o.summary}</p>}
            {(o.pros.length > 0 || o.cons.length > 0) && (
              <ul className="cmpc-list">
                {o.pros.map((p, k) => <li key={`p${k}`} className="is-pro"><GlyphPlus size={13} /><span><span className="sr-only">A favor: </span>{p}</span></li>)}
                {o.cons.map((c, k) => <li key={`c${k}`} className="is-con"><GlyphMinus size={13} /><span><span className="sr-only">En contra: </span>{c}</span></li>)}
              </ul>
            )}
            {env.interactive && (
              <button type="button" className={`btn ${i === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm cmpc-go`} disabled={picked !== null} onClick={() => choose(o.id, o.title)}>
                Elegir esta opción
              </button>
            )}
          </article>
        ))}
      </div>
    </GuFrame>
  )
}
