import './reasoning.css'

export interface CfThresholds { accept: number; explore_min: number; reject: number }
export const DEFAULT_THRESHOLDS: CfThresholds = { accept: 0.8, explore_min: 0.4, reject: -0.5 }

/** Parse the `cf_thresholds` setting defensively. */
export function parseThresholds(v: unknown): CfThresholds {
  if (!v || typeof v !== 'object') return DEFAULT_THRESHOLDS
  const o = v as Record<string, unknown>
  const n = (k: keyof CfThresholds) => (typeof o[k] === 'number' ? (o[k] as number) : DEFAULT_THRESHOLDS[k])
  return { accept: n('accept'), explore_min: n('explore_min'), reject: n('reject') }
}

const pos = (cf: number) => `${((Math.max(-1, Math.min(1, cf)) + 1) / 2) * 100}%`

/** Horizontal certainty-factor bar from −1 to 1. Center line = 0; fill grows from center with transform only. */
export function CfBar({ cf, label, status, thresholds }: {
  cf: number; label: string; status?: 'viva' | 'aceptada' | 'descartada'; thresholds?: CfThresholds
}) {
  const v = Math.max(-1, Math.min(1, Number.isFinite(cf) ? cf : 0))
  return (
    <div
      className={`cfbar${v < 0 ? ' is-neg' : ''}${status ? ` is-${status}` : ''}`}
      role="meter" aria-label={label} aria-valuemin={-1} aria-valuemax={1} aria-valuenow={Number(v.toFixed(2))}
      aria-valuetext={`Certeza ${v.toFixed(2)}`}
    >
      <span className="cfbar-fill" style={{ transform: `scaleX(${Math.abs(v)})` }} />
      <span className="cfbar-zero" aria-hidden="true" />
      {thresholds && ([['accept', thresholds.accept], ['explore_min', thresholds.explore_min], ['reject', thresholds.reject]] as const).map(([k, t]) => (
        <span key={k} className="cfbar-mark" style={{ left: pos(t) }} aria-hidden="true" title={`${k === 'accept' ? 'Umbral de aceptación' : k === 'reject' ? 'Umbral de descarte' : 'Mínimo para explorar'}: ${t}`} />
      ))}
    </div>
  )
}
