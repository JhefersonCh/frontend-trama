import './extras.css'

/** Thin instrument bar. Fill animates with transform only. `tone="warn"` highlights partial/incomplete states. */
export function Progress({ value, tone = 'accent', label, indeterminate = false }: {
  value: number; tone?: 'accent' | 'warn' | 'ok'; label: string; indeterminate?: boolean
}) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return (
    <div
      className={`pbar pbar-${tone}${indeterminate ? ' is-indeterminate' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(v * 100)}
    >
      <span className="pbar-fill" style={indeterminate ? undefined : { transform: `scaleX(${v})` }} />
    </div>
  )
}
