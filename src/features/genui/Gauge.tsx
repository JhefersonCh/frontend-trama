import { GlyphRetry } from './icons'
import { GuFrame } from './parts'
import type { BandTone, GaugeProps } from './schema'
import type { GenUiComponentProps } from './types'

const CX = 100, CY = 100, R = 78, RB = 92
const TONE_WORD: Record<BandTone, string> = { bad: 'Malo', warn: 'Regular', good: 'Bueno' }

const pt = (t: number, r: number) => {
  const a = Math.PI * (1 - t)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}
const arc = (t0: number, t1: number, r: number) => {
  const [x0, y0] = pt(t0, r)
  const [x1, y1] = pt(t1, r)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

function fmtValue(v: number) {
  if (Math.abs(v) >= 100) return Math.round(v).toString()
  return (Math.round(v * 10) / 10).toLocaleString('es-CO')
}

/** Semicircle meter with qualitative bands (bad / warn / good), labeled — never color alone. */
export function Gauge({ props, env }: GenUiComponentProps<GaugeProps>) {
  const t = Math.max(0, Math.min(1, props.value / props.max))
  const band = props.bands.find((b) => props.value <= b.to) ?? props.bands[props.bands.length - 1]
  const tone = band?.tone
  let prev = 0
  const segments = props.bands.map((b) => {
    const s = { from: prev / props.max, to: Math.min(1, b.to / props.max), tone: b.tone }
    prev = b.to
    return s
  }).filter((s) => s.to > s.from)
  const [nx, ny] = pt(t, R)

  return (
    <GuFrame component="gauge" eyebrow="Medición" label={`${props.label}: ${fmtValue(props.value)} ${props.unit}`}>
      <div className="gg">
        <svg className="gg-svg" viewBox="0 0 200 116" role="img" aria-label={`${props.label}: ${fmtValue(props.value)} ${props.unit} de un máximo de ${props.max}${tone ? `, ${TONE_WORD[tone].toLowerCase()}` : ''}`}>
          {segments.map((s, i) => (
            <path key={i} d={arc(s.from + 0.004, s.to - 0.004, RB)} className="gg-band" data-tone={s.tone} />
          ))}
          <path d={arc(0, 1, R)} className="gg-track" />
          <path d={arc(0, 1, R)} className="gg-value" data-tone={tone} pathLength={1} style={{ strokeDasharray: `${t} 1` }} />
          <circle cx={nx} cy={ny} r={5} className="gg-knob" data-tone={tone} />
          <text x={CX - R} y={CY + 14} className="gg-axis" textAnchor="middle">0</text>
          <text x={CX + R} y={CY + 14} className="gg-axis" textAnchor="middle">{fmtValue(props.max)}</text>
        </svg>
        <div className="gg-read">
          <p className="gg-num"><span className="gg-val">{fmtValue(props.value)}</span><span className="gg-unit">{props.unit}</span></p>
          <p className="gg-label">{props.label}</p>
          {tone && <p className="gg-tone" data-tone={tone}><span className="gg-tone-led" aria-hidden="true" />{TONE_WORD[tone]}</p>}
        </div>
      </div>
      {env.interactive && (
        <div className="gu-actions gu-actions-center">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => env.emit('gauge_retry', {})}><GlyphRetry size={14} />Repetir prueba</button>
        </div>
      )}
    </GuFrame>
  )
}
