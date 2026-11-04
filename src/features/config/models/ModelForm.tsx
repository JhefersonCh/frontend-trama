import { useState, type FormEvent } from 'react'
import { Button, Field, FieldError, Input, Select, Textarea } from '../../../shared/ui'
import type { ModelProfile, ModelProfileInput, ModelRole, Provider } from '../../../shared/api'
import { ROLES } from './roles'

export function parseParams(text: string): { value?: Record<string, unknown>; error?: string } {
  if (!text.trim()) return { value: {} }
  try {
    const v = JSON.parse(text)
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return { error: 'Los parámetros deben ser un objeto JSON' }
    return { value: v as Record<string, unknown> }
  } catch (e) {
    return { error: `JSON inválido: ${(e as Error).message}` }
  }
}

export function ModelForm({ initial, providers, error, pending, onSubmit, onCancel }: {
  initial?: ModelProfile
  providers: Provider[]
  error?: string | null
  pending?: boolean
  onSubmit: (v: ModelProfileInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState<ModelRole>(initial?.role ?? 'llm')
  const [providerId, setProviderId] = useState(String(initial?.provider_id ?? providers[0]?.id ?? ''))
  const [modelRef, setModelRef] = useState(initial?.model_ref ?? '')
  const [mem, setMem] = useState(initial?.est_memory_mb != null ? String(initial.est_memory_mb) : '')
  const [params, setParams] = useState(JSON.stringify(initial?.params ?? {}, null, 2))
  const [paramsError, setParamsError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseParams(params)
    if (parsed.error) return setParamsError(parsed.error)
    setParamsError(null)
    const provider = providers.find((p) => String(p.id) === providerId)
    onSubmit({
      name: name.trim(),
      role,
      provider_id: provider ? provider.id : providerId,
      model_ref: modelRef.trim(),
      params: parsed.value,
      est_memory_mb: mem.trim() === '' ? null : Number(mem),
    })
  }

  return (
    <form onSubmit={submit} className="form">
      <Field label="Nombre" htmlFor="mp-name"><Input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="Rol" htmlFor="mp-role">
        <Select id="mp-role" value={role} options={ROLES.map((r) => ({ value: r.role, label: r.label }))} onChange={(e) => setRole(e.target.value as ModelRole)} />
      </Field>
      <Field label="Proveedor" htmlFor="mp-provider">
        <Select id="mp-provider" value={providerId} options={providers.map((p) => ({ value: String(p.id), label: p.name }))} onChange={(e) => setProviderId(e.target.value)} required />
      </Field>
      <Field label="Referencia del modelo" htmlFor="mp-ref"><Input id="mp-ref" className="mono" value={modelRef} onChange={(e) => setModelRef(e.target.value)} placeholder="gemma3:4b" required /></Field>
      <Field label="Memoria estimada (MB)" htmlFor="mp-mem"><Input id="mp-mem" className="mono" type="number" min={0} value={mem} onChange={(e) => setMem(e.target.value)} /></Field>
      <Field label="Parámetros (JSON)" htmlFor="mp-params" error={paramsError}>
        <Textarea id="mp-params" rows={6} spellCheck={false} value={params} onChange={(e) => setParams(e.target.value)} />
      </Field>
      {error && <FieldError>{error}</FieldError>}
      <div className="actions">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={pending || providers.length === 0}>Guardar</Button>
      </div>
    </form>
  )
}
