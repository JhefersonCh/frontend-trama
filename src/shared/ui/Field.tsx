import type { ReactNode } from 'react'
import { IconAlert } from './icons'

export function Field({ label, htmlFor, error, hint, children }: {
  label: string; htmlFor: string; error?: string | null; hint?: string; children: ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small className="hint">{hint}</small>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return <small className="field-error" role="alert"><IconAlert size={14} />{children}</small>
}
