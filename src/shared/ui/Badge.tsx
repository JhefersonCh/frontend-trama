import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

export function Badge({ tone = 'neutral', led = false, icon, children }: {
  tone?: Tone; led?: boolean; icon?: ReactNode; children: ReactNode
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {led && <span className="badge-led" aria-hidden="true" />}
      {icon}
      {children}
    </span>
  )
}
