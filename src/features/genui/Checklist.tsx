import { useEffect, useState } from 'react'
import { Progress } from '../../shared/ui/Progress'
import { GlyphCheck, GlyphCross } from './icons'
import { GuFrame } from './parts'
import type { ChecklistProps, Step } from './schema'
import type { GenUiComponentProps } from './types'

const STEP_LABEL = { pending: 'Pendiente', done: 'Hecho', failed: 'No se pudo' } as const

/** Guided steps. The server re-emits the same id with new statuses; we only lock the step we just reported. */
export function Checklist({ props, env }: GenUiComponentProps<ChecklistProps>) {
  const [sending, setSending] = useState<string | null>(null)
  // A live update from the server settles whatever we were waiting for.
  useEffect(() => { setSending(null) }, [props])

  const { steps } = props
  const done = steps.filter((s) => s.status === 'done').length
  const settled = steps.every((s) => s.status !== 'pending')
  const failed = steps.some((s) => s.status === 'failed')
  const current = props.current ?? steps.find((s) => s.status === 'pending')?.id ?? null

  const report = (s: Step, ok: boolean) => {
    if (sending) return
    setSending(s.id)
    if (!env.emit(ok ? 'step_done' : 'step_failed', { action_id: props.action_id, step_id: s.id })) setSending(null)
  }

  return (
    <GuFrame
      component="checklist"
      eyebrow="Pasos guiados"
      meta={<span className="mono">{done}/{steps.length}</span>}
      label={props.title}
      className={settled ? (failed ? 'is-settled is-partial' : 'is-settled is-complete') : ''}
    >
      <div className="ck-top">
        <h4 className="gu-title">{props.title}</h4>
        {settled && (
          <span className={`ck-result ${failed ? 'is-partial' : 'is-complete'}`} role="status">
            {failed ? <GlyphCross size={13} /> : <GlyphCheck size={13} />}{failed ? 'Con pasos sin completar' : 'Completado'}
          </span>
        )}
      </div>
      <Progress value={done / steps.length} tone={failed ? 'warn' : settled ? 'ok' : 'accent'} label={`Avance: ${done} de ${steps.length} pasos`} />
      <ol className="ck-steps">
        {steps.map((s, i) => {
          const isCurrent = !settled && s.id === current && s.status === 'pending'
          return (
            <li key={s.id} className="ck-step" data-status={s.status} data-current={isCurrent || undefined} aria-current={isCurrent ? 'step' : undefined}>
              <span className="ck-mark" aria-hidden="true">
                <span className="ck-num">{i + 1}</span>
                <GlyphCheck size={14} className="ck-glyph ck-glyph-done" />
                <GlyphCross size={13} className="ck-glyph ck-glyph-failed" />
              </span>
              <div className="ck-body">
                <p className="ck-text">{s.text}<span className="sr-only"> · {STEP_LABEL[s.status]}</span></p>
                {isCurrent && env.interactive && (
                  <div className="ck-actions">
                    <button type="button" className="btn btn-primary btn-sm" disabled={sending !== null} onClick={() => report(s, true)}>
                      {sending === s.id ? 'Enviando…' : 'Ya lo hice'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={sending !== null} onClick={() => report(s, false)}>No pude</button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </GuFrame>
  )
}
