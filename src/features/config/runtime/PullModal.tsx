import { useEffect, useRef, useState, type FormEvent } from 'react'
import { pullModel, type PullProgress, type RuntimeProvider } from '../../../shared/api/runtime'
import { Banner, Button, Field, Input, Modal } from '../../../shared/ui'
import { Progress } from '../../../shared/ui/Progress'

const mb = (n: number) => `${(n / 1048576).toFixed(n > 1073741824 ? 0 : 1)} MB`

/** "Descargar modelo" for an Ollama provider: POST + SSE, progress bar from {completed,total}. */
export function PullModal({ provider, onClose, onDone }: { provider: RuntimeProvider; onClose: () => void; onDone: () => void }) {
  const [ref, setRef] = useState('')
  const [phase, setPhase] = useState<'idle' | 'pulling' | 'done' | 'error'>('idle')
  const [prog, setProg] = useState<PullProgress>({})
  const [error, setError] = useState<string | null>(null)
  const ctl = useRef<AbortController | null>(null)
  useEffect(() => () => ctl.current?.abort(), [])

  const start = async (e: FormEvent) => {
    e.preventDefault()
    const c = new AbortController()
    ctl.current = c
    setPhase('pulling'); setError(null); setProg({ status: 'iniciando' })
    try {
      await pullModel(provider.provider_id, ref.trim(), setProg, c.signal)
      setPhase('done'); onDone()
    } catch (err) {
      if (c.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Error desconocido'); setPhase('error')
    }
  }

  const ratio = prog.total ? (prog.completed ?? 0) / prog.total : 0
  const pulling = phase === 'pulling'

  return (
    <Modal title={`Descargar modelo · ${provider.name}`} onClose={onClose}>
      <form className="form" onSubmit={start}>
        <Field label="Referencia del modelo" htmlFor="pull-ref" hint="Tal como aparece en la librería de Ollama, p. ej. gemma3:4b">
          <Input id="pull-ref" className="mono" required autoFocus disabled={pulling} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="nombre:tag" />
        </Field>
        {phase !== 'idle' && phase !== 'error' && (
          <div className="pull-prog" aria-live="polite">
            <Progress value={phase === 'done' ? 1 : ratio} tone={phase === 'done' ? 'ok' : 'accent'} label="Progreso de descarga" indeterminate={pulling && !prog.total} />
            <p className="pull-line">
              <span className="mono">{phase === 'done' ? 'completado' : prog.status ?? '…'}</span>
              {pulling && prog.total ? <span className="mono">{mb(prog.completed ?? 0)} / {mb(prog.total)} · {Math.round(ratio * 100)}%</span> : null}
            </p>
          </div>
        )}
        {error && <Banner tone="error">{error}</Banner>}
        {phase === 'done' && <Banner tone="success">Modelo descargado. Cree un perfil con esa referencia para usarlo.</Banner>}
        <div className="actions">
          <Button variant="ghost" onClick={onClose}>{phase === 'done' ? 'Cerrar' : 'Cancelar'}</Button>
          {phase !== 'done' && <Button type="submit" variant="primary" disabled={pulling || !ref.trim()}>{pulling ? 'Descargando…' : 'Descargar'}</Button>}
        </div>
      </form>
    </Modal>
  )
}
