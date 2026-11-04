import { useState, type FormEvent } from 'react'
import { Button, Field, FieldError, Input, Select } from '../../../shared/ui'
import type { Provider, ProviderInput, ProviderKind } from '../../../shared/api'

export const KIND_OPTIONS: { value: ProviderKind; label: string }[] = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'llamacpp', label: 'llama.cpp' },
  { value: 'openai_compatible', label: 'Compatible con OpenAI' },
  { value: 'voice_service', label: 'Servicio de voz' },
]

export function ProviderForm({ initial, error, pending, onSubmit, onCancel }: {
  initial?: Provider
  error?: string | null
  pending?: boolean
  onSubmit: (v: ProviderInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<ProviderKind>(initial?.kind ?? 'ollama')
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ name: name.trim(), kind, base_url: baseUrl.trim(), enabled })
  }

  return (
    <form onSubmit={submit} className="form">
      <Field label="Nombre" htmlFor="prov-name">
        <Input id="prov-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Tipo" htmlFor="prov-kind">
        <Select id="prov-kind" value={kind} options={KIND_OPTIONS} onChange={(e) => setKind(e.target.value as ProviderKind)} />
      </Field>
      <Field label="URL base" htmlFor="prov-url">
        <Input id="prov-url" className="mono" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://ollama:11434" required />
      </Field>
      <label className="check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Habilitado
      </label>
      {error && <FieldError>{error}</FieldError>}
      <div className="actions">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={pending}>Guardar</Button>
      </div>
    </form>
  )
}
