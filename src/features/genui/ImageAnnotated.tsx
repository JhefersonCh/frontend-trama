import { useState } from 'react'
import { mediaUrl } from '../../shared/api/media'
import { GuFrame } from './parts'
import type { ImageAnnotatedProps, LedColor } from './schema'
import type { GenUiComponentProps } from './types'

const COLOR_WORD: Record<LedColor, string> = { roja: 'roja', verde: 'verde', naranja: 'naranja', apagada: 'apagada', desconocido: 'sin identificar' }

/** Photo with the detected lights boxed and labeled, plus a yes/no confirmation. */
export function ImageAnnotated({ props, env }: GenUiComponentProps<ImageAnnotatedProps>) {
  const [answered, setAnswered] = useState<boolean | null>(null)
  const [broken, setBroken] = useState(false)
  const confirm = (ok: boolean) => {
    if (answered !== null) return
    setAnswered(ok)
    if (!env.emit('image_confirm', { media_id: props.media_id, confirmed: ok }, { answer: ok ? 'Sí, es esa' : 'No es esa' })) setAnswered(null)
  }
  const src = mediaUrl(props.url, env.sessionId)
  const desc = props.boxes.length
    ? props.boxes.map((b) => `${b.label || 'luz'} ${COLOR_WORD[b.color]}`).join(', ')
    : 'sin luces detectadas'

  return (
    <GuFrame component="image_annotated" eyebrow="Foto analizada" meta={<span className="mono">{props.boxes.length} luces</span>} label="Foto analizada">
      <figure className="ia" style={{ aspectRatio: `${props.width} / ${props.height}` }}>
        {broken
          ? <div className="ia-broken">No se pudo cargar la imagen.</div>
          : <img src={src} alt={`Foto del equipo: ${desc}`} onError={() => setBroken(true)} draggable={false} />}
        <svg className="ia-svg" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {props.boxes.map((b, i) => (
            <rect
              key={i} x={b.bbox[0]} y={b.bbox[1]} width={b.bbox[2]} height={b.bbox[3]} rx={0.01}
              className="ia-box" data-color={b.color} vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            />
          ))}
        </svg>
        {props.boxes.map((b, i) => (
          <span
            key={i} className="ia-tag" data-color={b.color} aria-hidden="true"
            style={{ left: `${b.bbox[0] * 100}%`, top: `${b.bbox[1] * 100}%`, animationDelay: `${160 + i * 60}ms` }}
          >
            <span className="ia-tag-dot" />{b.label || 'luz'} · {COLOR_WORD[b.color]}
          </span>
        ))}
      </figure>
      {(props.question || props.confirm_fact) && env.interactive && (
        <div className="ia-ask">
          <p className="gu-question">{props.question ?? '¿Es correcto lo que se detectó?'}</p>
          <div className="gu-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={answered !== null} onClick={() => confirm(true)}>Sí, es esa</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={answered !== null} onClick={() => confirm(false)}>No</button>
          </div>
        </div>
      )}
    </GuFrame>
  )
}
