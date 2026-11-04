import { useState, type FormEvent } from 'react'
import { Button, Field, FieldError, Input, Textarea } from '../../../shared/ui'
import type { FieldDef, SettingDef } from './definitions'

type Draft = Record<string, string | boolean>

function toDraft(def: SettingDef, value: unknown): Draft {
  const d: Draft = {}
  for (const f of def.fields) {
    const raw = f.name === '' ? value : (value as Record<string, unknown> | undefined)?.[f.name]
    d[f.name] = f.kind === 'boolean' ? Boolean(raw) : raw == null ? '' : String(raw)
  }
  return d
}

function coerce(f: FieldDef, v: string | boolean): unknown {
  if (f.kind === 'number') return v === '' ? null : Number(v)
  return v
}

export function buildValue(def: SettingDef, draft: Draft): unknown {
  if (def.fields.length === 1 && def.fields[0].name === '') return coerce(def.fields[0], draft[''])
  return Object.fromEntries(def.fields.map((f) => [f.name, coerce(f, draft[f.name])]))
}

export function SettingForm({ def, value, pending, saved, error, onSave }: {
  def: SettingDef
  value: unknown
  pending?: boolean
  saved?: boolean
  error?: string | null
  onSave: (value: unknown) => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(def, value))
  const set = (name: string, v: string | boolean) => setDraft((d) => ({ ...d, [name]: v }))
  const submit = (e: FormEvent) => { e.preventDefault(); onSave(buildValue(def, draft)) }

  return (
    <form onSubmit={submit} className="card setting form" aria-label={def.title}>
      <header className="setting-head">
        <p className="eyebrow">{def.key}</p>
        <h3>{def.title}</h3>
      </header>
      {def.fields.map((f) => {
        const id = `set-${def.key}-${f.name || 'value'}`
        if (f.kind === 'boolean') {
          return (
            <label key={id} className="check" htmlFor={id}>
              <input id={id} type="checkbox" checked={Boolean(draft[f.name])} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}
            </label>
          )
        }
        return (
          <Field key={id} label={f.label} htmlFor={id}>
            {f.kind === 'textarea'
              ? <Textarea id={id} rows={6} value={String(draft[f.name])} onChange={(e) => set(f.name, e.target.value)} />
              : <Input id={id} className={f.kind === 'number' ? 'mono' : ''} type={f.kind === 'number' ? 'number' : 'text'} step={f.step} value={String(draft[f.name])} onChange={(e) => set(f.name, e.target.value)} />}
          </Field>
        )
      })}
      {error && <FieldError>{error}</FieldError>}
      <div className="actions">
        {saved && !pending && !error && <span className="saved" role="status"><span className="led" data-on="ok" aria-hidden="true" />Guardado</span>}
        <Button variant="primary" type="submit" disabled={pending}>Guardar</Button>
      </div>
    </form>
  )
}
