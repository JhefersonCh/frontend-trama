import { useState, type FormEvent } from 'react'
import { Button, FieldError, Input, Textarea } from '../../../shared/ui'

type Budget = { text: number; voice: number }

/** Turn types of `max_tokens_by_intent` (keys must match the backend validator). */
const TOKEN_ROWS: { key: string; label: string; hint: string }[] = [
  { key: 'diagnostic', label: 'Diagnóstico', hint: 'Explicación + pasos' },
  { key: 'guide', label: 'Guía paso a paso', hint: '"No sé cómo hacerlo"' },
  { key: 'output', label: 'Salida de comandos', hint: 'ipconfig, ping pegados' },
  { key: 'consulta', label: 'Consulta técnica', hint: '¿Cómo configuro…?' },
  { key: 'clarify', label: 'Aclaración / ¿por qué?', hint: '' },
  { key: 'ticket', label: 'Estado de ticket', hint: '' },
  { key: 'inventory', label: 'Inventario', hint: '' },
  { key: 'smalltalk', label: 'Saludo', hint: '' },
  { key: 'closing', label: 'Despedida', hint: '' },
  { key: 'plantilla', label: 'Respuestas de plantilla', hint: 'Ticket creado, seguimiento…' },
  { key: 'extraccion', label: 'Extracción de hechos', hint: 'JSON interno del agente' },
]

function SavedLed({ show }: { show: boolean }) {
  return show ? <span className="saved" role="status"><span className="led" data-on="ok" aria-hidden="true" />Guardado</span> : null
}

/** Editor for the `max_tokens_by_intent` setting: one row per turn type, text and voice limits. */
export function TokenLimitsForm({ value, pending, saved, error, onSave }: {
  value: unknown
  pending?: boolean
  saved?: boolean
  error?: string | null
  onSave: (value: unknown) => void
}) {
  const current = (value && typeof value === 'object' ? value : {}) as Record<string, Partial<Budget>>
  const [draft, setDraft] = useState<Record<string, { text: string; voice: string }>>(() =>
    Object.fromEntries(TOKEN_ROWS.map((r) => [r.key, {
      text: current[r.key]?.text != null ? String(current[r.key]?.text) : '',
      voice: current[r.key]?.voice != null ? String(current[r.key]?.voice) : '',
    }])),
  )
  const set = (key: string, mode: 'text' | 'voice', v: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [mode]: v } }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const out: Record<string, Budget> = {}
    for (const r of TOKEN_ROWS) {
      const t = Number(draft[r.key].text), v = Number(draft[r.key].voice)
      if (draft[r.key].text !== '' && draft[r.key].voice !== '') out[r.key] = { text: t, voice: v }
    }
    onSave(out)
  }
  return (
    <form onSubmit={submit} className="card setting form setting-wide" aria-label="Longitud de las respuestas">
      <header className="setting-head">
        <p className="eyebrow">max_tokens_by_intent</p>
        <h3>Longitud máxima de las respuestas</h3>
        <p className="muted">Tokens máximos que el modelo puede generar por tipo de turno. Si una respuesta se corta («…»), suba el valor. Las filas vacías usan el valor por defecto.</p>
      </header>
      <div className="token-grid" role="table" aria-label="Límites por tipo de turno">
        <div className="token-row token-head" role="row">
          <span role="columnheader">Tipo de turno</span><span role="columnheader">Texto</span><span role="columnheader">Voz</span>
        </div>
        {TOKEN_ROWS.map((r) => (
          <div className="token-row" role="row" key={r.key}>
            <span role="cell"><strong>{r.label}</strong>{r.hint && <small className="muted"> · {r.hint}</small>}</span>
            <span role="cell"><Input aria-label={`${r.label} texto`} className="mono" type="number" min={16} max={8000} value={draft[r.key].text} onChange={(e) => set(r.key, 'text', e.target.value)} /></span>
            <span role="cell"><Input aria-label={`${r.label} voz`} className="mono" type="number" min={16} max={8000} value={draft[r.key].voice} onChange={(e) => set(r.key, 'voice', e.target.value)} /></span>
          </div>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
      <div className="actions">
        <SavedLed show={Boolean(saved && !pending && !error)} />
        <Button variant="primary" type="submit" disabled={pending}>Guardar</Button>
      </div>
    </form>
  )
}

/** Any other setting stored in the DB without a dedicated form: edited as JSON, validated by the server. */
export function JsonSettingForm({ settingKey, value, pending, saved, error, onSave }: {
  settingKey: string
  value: unknown
  pending?: boolean
  saved?: boolean
  error?: string | null
  onSave: (value: unknown) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    try {
      const parsed = JSON.parse(text)
      setParseError(null)
      onSave(parsed)
    } catch {
      setParseError('JSON inválido: revise comas, comillas y llaves.')
    }
  }
  const rows = Math.min(14, Math.max(2, text.split('\n').length))
  return (
    <form onSubmit={submit} className="card setting form" aria-label={settingKey}>
      <header className="setting-head">
        <p className="eyebrow">avanzado</p>
        <h3 className="mono">{settingKey}</h3>
      </header>
      <Textarea className="mono" rows={rows} value={text} onChange={(e) => setText(e.target.value)} aria-label={`Valor JSON de ${settingKey}`} spellCheck={false} />
      {(parseError || error) && <FieldError>{parseError || error}</FieldError>}
      <div className="actions">
        <SavedLed show={Boolean(saved && !pending && !error && !parseError)} />
        <Button variant="primary" type="submit" disabled={pending}>Guardar</Button>
      </div>
    </form>
  )
}
