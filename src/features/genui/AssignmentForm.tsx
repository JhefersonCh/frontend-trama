import { useId, useState, type FormEvent } from 'react'
import { GuFrame } from './parts'
import type { FormField, FormProps } from './schema'
import type { GenUiComponentProps } from './types'

/** Short option sets read best as a segmented control; long ones fall back to a select. */
const segmented = (f: FormField) => !!f.options && f.options.length <= 4 && f.options.every((o) => o.label.length <= 18)

/**
 * Assignment form (zona / modalidad / franja / contacto). The contact value lives only in this
 * component while typing: it travels once inside `form_submit` and is never echoed into the chat.
 */
export function AssignmentForm({ props, env }: GenUiComponentProps<FormProps>) {
  const uid = useId()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.fields.filter((f) => f.type !== 'consent_text').map((f) => [f.name, f.value ?? ''])),
  )
  const [consent, setConsent] = useState<Record<string, boolean>>({})
  const [contact, setContact] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const missing = props.fields.filter((f) => f.type === 'select' && !values[f.name])
  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (sent || missing.length || !env.interactive) return
    const payload: Record<string, string> = { ...values }
    for (const f of props.fields) {
      if (f.type !== 'consent_text') continue
      const v = consent[f.name] ? (contact[f.name] ?? '').trim() : ''
      if (v) payload[f.name] = v
    }
    // Human summary for the collapsed row: selections only, never the contact.
    const summary = props.fields
      .filter((f) => f.type !== 'consent_text' && payload[f.name])
      .map((f) => f.options?.find((o) => o.value === payload[f.name])?.label ?? payload[f.name])
      .join(' · ')
    setSent(true)
    const ok = env.emit('form_submit', { form_id: props.form_id, values: payload }, { answer: summary ? `Enviado: ${summary}` : 'Formulario enviado' })
    setContact({})
    if (!ok) setSent(false)
  }

  return (
    <GuFrame component="form" eyebrow="Formulario" label={props.title}>
      <h4 className="gu-title">{props.title}</h4>
      <form className="fm" onSubmit={submit} noValidate>
        {props.fields.map((f) => {
          const fid = `${uid}-${f.name}`
          if (f.type === 'consent_text') {
            const on = !!consent[f.name]
            return (
              <div key={f.name} className="fm-consent" data-on={on || undefined}>
                <label className="fm-check">
                  <input type="checkbox" checked={on} disabled={sent} onChange={(e) => setConsent((s) => ({ ...s, [f.name]: e.target.checked }))} />
                  <span className="fm-box" aria-hidden="true" />
                  <span>{f.label}</span>
                </label>
                {on && (
                  <div className="fm-reveal">
                    <label className="fm-label" htmlFor={fid}>Contacto <span className="fm-opt">opcional</span></label>
                    <input
                      id={fid} className="control" value={contact[f.name] ?? ''} disabled={sent} autoComplete="off" maxLength={120}
                      placeholder={f.placeholder ?? 'Teléfono o correo'}
                      onChange={(e) => setContact((s) => ({ ...s, [f.name]: e.target.value }))}
                    />
                    <p className="fm-note">Solo se usa para que el técnico le contacte. No queda escrito en el chat.</p>
                  </div>
                )}
              </div>
            )
          }
          if (f.type === 'select' && segmented(f)) {
            return (
              <fieldset key={f.name} className="fm-field">
                <legend className="fm-label">{f.label}</legend>
                <div className="seg" role="radiogroup" aria-label={f.label}>
                  {f.options!.map((o) => (
                    <label key={o.value} className="seg-opt" data-on={values[f.name] === o.value || undefined}>
                      <input type="radio" name={fid} value={o.value} checked={values[f.name] === o.value} disabled={sent} onChange={() => set(f.name, o.value)} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          }
          return (
            <div key={f.name} className="fm-field">
              <label className="fm-label" htmlFor={fid}>{f.label}</label>
              {f.type === 'select' ? (
                <select id={fid} className="control" value={values[f.name]} disabled={sent} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="" disabled>{f.placeholder ?? 'Elija una opción'}</option>
                  {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input id={fid} className="control" value={values[f.name]} disabled={sent} placeholder={f.placeholder} maxLength={200} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </div>
          )
        })}
        <div className="fm-foot">
          <button type="submit" className="btn btn-primary" disabled={sent || missing.length > 0 || !env.interactive}>
            {sent ? 'Enviando…' : props.submit_label}
          </button>
          {missing.length > 0 && !sent && <span className="fm-hint">Falta: {missing.map((f) => f.label.toLowerCase()).join(', ')}</span>}
        </div>
      </form>
    </GuFrame>
  )
}
