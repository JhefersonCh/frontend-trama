import type { ReactNode } from 'react'

/** View header: mono index/kicker, display title, short description. */
export function PageHeader({ index, kicker, title, children, actions }: {
  index?: string; kicker: string; title: string; children?: ReactNode; actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{index && <span className="kicker-idx">{index}</span>}{kicker}</p>
        <h1>{title}</h1>
        {children && <p className="page-desc">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function SectionHead({ title, meta, children }: { title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <div className="section-title">
        <h2>{title}</h2>
        {meta != null && <span className="section-meta">{meta}</span>}
      </div>
      {children}
    </div>
  )
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <p className="loading" role="status"><span className="loading-bar" aria-hidden="true" />{label}</p>
}
