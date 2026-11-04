import { useState, type FormEvent } from 'react'
import { Badge, Button, Field, FieldError, IconLock, Input } from '../../../shared/ui'

/** Never receives or shows the stored secret: only has_secret. */
export function SecretForm({ hasSecret, error, pending, onSave, onRemove, onCancel }: {
  hasSecret: boolean
  error?: string | null
  pending?: boolean
  onSave: (value: string) => void
  onRemove: () => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value) onSave(value)
  }
  return (
    <form onSubmit={submit} className="form">
      <div className="secret-state">{hasSecret ? <Badge tone="accent" icon={<IconLock size={13} />}>Credencial configurada</Badge> : <Badge led>Sin credencial</Badge>}</div>
      <Field label="Nueva credencial" htmlFor="prov-secret" hint="Se guarda cifrada y no se vuelve a mostrar.">
        <Input id="prov-secret" type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      {error && <FieldError>{error}</FieldError>}
      <div className="actions">
        {hasSecret && <Button variant="danger" onClick={onRemove} disabled={pending}>Quitar credencial</Button>}
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={pending || !value}>Guardar credencial</Button>
      </div>
    </form>
  )
}
