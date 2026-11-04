import { useEffect, useState } from 'react'
import { Button, IconPlus, Select, Textarea } from '../../../shared/ui'
import type { JsonSchema } from '../../../shared/api/tools'

const TYPES = [
  { value: 'string', label: 'Texto' },
  { value: 'integer', label: 'Entero' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sí / No' },
]
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/

/** Returns an error message, or null when the text is a usable object schema. */
export function parseSchema(text: string): { schema: JsonSchema | null; error: string | null } {
  let v: unknown
  try { v = JSON.parse(text) } catch (e) { return { schema: null, error: `JSON inválido: ${(e as Error).message}` } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { schema: null, error: 'Debe ser un objeto JSON.' }
  const s = v as JsonSchema
  if (s.type !== 'object') return { schema: null, error: 'Debe incluir "type": "object".' }
  if (s.properties !== undefined && (typeof s.properties !== 'object' || Array.isArray(s.properties))) {
    return { schema: null, error: '"properties" debe ser un objeto.' }
  }
  if (JSON.stringify(s).includes('"$ref"')) return { schema: null, error: 'No se admiten referencias ($ref).' }
  if (Object.keys(s.properties ?? {}).length > 10) return { schema: null, error: 'Máximo 10 parámetros.' }
  for (const k of Object.keys(s.properties ?? {})) if (!NAME_RE.test(k)) return { schema: null, error: `Nombre de parámetro inválido: ${k}` }
  return { schema: s, error: null }
}

type Mode = 'fields' | 'json'

/** Params editor: simple field builder or raw JSON Schema (validated while typing). `onChange(null)` = invalid. */
export function SchemaEditor({ value, onChange, idPrefix = 'schema' }: {
  value: JsonSchema; onChange: (s: JsonSchema | null) => void; idPrefix?: string
}) {
  const [mode, setMode] = useState<Mode>('fields')
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [error, setError] = useState<string | null>(null)

  // Keep the text in sync when the schema changes from outside (builder edits push through `commit`).
  useEffect(() => { if (!error) setText(JSON.stringify(value, null, 2)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const onText = (t: string) => {
    setText(t)
    const r = parseSchema(t)
    setError(r.error)
    onChange(r.schema)
  }
  const props = value.properties ?? {}
  const required = new Set(value.required ?? [])
  const commit = (next: Record<string, { type?: string; description?: string }>, req: Set<string>) => {
    const s: JsonSchema = { ...value, type: 'object', properties: next }
    if (req.size) s.required = [...req].filter((k) => k in next)
    else delete s.required
    setError(null)
    onChange(s)
  }
  const rename = (old: string, nu: string) => {
    const next: Record<string, { type?: string; description?: string }> = {}
    for (const [k, v] of Object.entries(props)) next[k === old ? nu : k] = v
    const req = new Set([...required].map((k) => (k === old ? nu : k)))
    commit(next, req)
  }
  const bad = Object.keys(props).find((k) => !NAME_RE.test(k))

  return (
    <div className="tl-schema">
      <div className="tl-seg" role="tablist" aria-label="Modo del editor de parámetros">
        <button type="button" role="tab" aria-selected={mode === 'fields'} onClick={() => setMode('fields')}>Campos</button>
        <button type="button" role="tab" aria-selected={mode === 'json'} onClick={() => setMode('json')}>JSON Schema</button>
      </div>
      {mode === 'fields' ? (
        error ? <p className="field-error">Corrija el JSON antes de usar el editor de campos: {error}</p> : (
          <div className="tl-fields">
            {Object.keys(props).length === 0 && <p className="hint">Sin parámetros: la herramienta no recibe datos.</p>}
            {Object.entries(props).map(([k, p], i) => (
              <div className="tl-field-row" key={i}>
                <input className="control mono" aria-label="Nombre del parámetro" value={k} onChange={(e) => rename(k, e.target.value)} placeholder="nombre" />
                <Select aria-label="Tipo" value={p.type ?? 'string'} options={TYPES}
                  onChange={(e) => commit({ ...props, [k]: { ...p, type: e.target.value } }, required)} />
                <input className="control" aria-label="Descripción del parámetro" value={p.description ?? ''} placeholder="Qué representa (lo lee el modelo)"
                  onChange={(e) => commit({ ...props, [k]: { ...p, description: e.target.value } }, required)} />
                <label className="check tl-req">
                  <input type="checkbox" checked={required.has(k)} onChange={(e) => {
                    const r = new Set(required); if (e.target.checked) r.add(k); else r.delete(k)
                    commit(props, r)
                  }} /> Obligatorio
                </label>
                <button type="button" className="icon-btn" aria-label={`Quitar ${k}`} onClick={() => {
                  const next = { ...props }; delete next[k]; commit(next, required)
                }}>×</button>
              </div>
            ))}
            {bad && <p className="field-error">Nombre inválido: {bad}. Use letras, números y guion bajo.</p>}
            <Button size="sm" disabled={Object.keys(props).length >= 10} onClick={() => {
              let n = 1; while (`param${n}` in props) n++
              commit({ ...props, [`param${n}`]: { type: 'string', description: '' } }, required)
            }}><IconPlus size={14} />Agregar parámetro</Button>
          </div>
        )
      ) : (
        <>
          <label htmlFor={`${idPrefix}-json`} className="sr-only">JSON Schema de los parámetros</label>
          <Textarea id={`${idPrefix}-json`} className="mono tl-code" rows={10} spellCheck={false} value={text} onChange={(e) => onText(e.target.value)} />
          {error ? <p className="field-error" role="alert">{error}</p> : <p className="hint">Esquema válido. Máximo 10 parámetros, sin referencias.</p>}
        </>
      )}
    </div>
  )
}
