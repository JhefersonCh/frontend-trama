import { useEffect, useRef, useState } from 'react'
import type { Pctl, Stage, Timeseries } from '../../shared/api/metrics'
import { fmtInt, fmtMs, humanize, niceMax } from './format'

/* ---------- Latency by stage: p50 (amber) over p95 (cyan) ---------- */
const STAGES: { key: Stage; short: string; label: string }[] = [
  { key: 'stt', short: 'STT', label: 'Voz a texto' },
  { key: 'rag', short: 'RAG', label: 'Recuperación' },
  { key: 'llm_first_token', short: 'LLM', label: 'Primer token' },
  { key: 'tts_first_audio', short: 'TTS', label: 'Primer audio' },
  { key: 'total', short: 'TOT', label: 'Turno completo' },
]

export function LatencyStages({ data }: { data: Record<Stage, Pctl> }) {
  const max = Math.max(1, ...STAGES.map((s) => data[s.key]?.p95 ?? data[s.key]?.p50 ?? 0))
  const w = (v: number | null) => `${Math.max(0.8, ((v ?? 0) / max) * 100)}%`
  return (
    <div>
      <ul className="stages" aria-label="Latencia por etapa">
        {STAGES.map((s) => {
          const d = data[s.key] ?? { p50: null, p95: null }
          const empty = d.p50 == null && d.p95 == null
          return (
            <li key={s.key} className={`stage${s.key === 'total' ? ' is-total' : ''}${empty ? ' is-empty' : ''}`}>
              <span className="stage-name"><b>{s.short}</b><span>{s.label}</span></span>
              <span className="stage-bars" role="img" aria-label={`${s.label}: p50 ${fmtMs(d.p50)}, p95 ${fmtMs(d.p95)}`}>
                {!empty && <><i className="bar bar-p50" style={{ width: w(d.p50) }} /><i className="bar bar-p95" style={{ width: w(d.p95) }} /></>}
              </span>
              <span className="stage-vals mono">{empty ? 'sin datos' : <><span>{fmtMs(d.p50)}</span><span className="muted">{fmtMs(d.p95)}</span></>}</span>
            </li>
          )
        })}
      </ul>
      <p className="legend"><span className="key key-p50" />p50 (mediana) <span className="key key-p95" />p95 (casos lentos)</p>
    </div>
  )
}

/* ---------- Share bar (intents, mode) ---------- */
export function ShareList({ items }: { items: [string, number][] }) {
  const total = items.reduce((a, [, n]) => a + n, 0) || 1
  const max = Math.max(1, ...items.map(([, n]) => n))
  return (
    <ul className="shares">
      {items.map(([k, n]) => (
        <li key={k}>
          <span className="share-name">{humanize(k)}</span>
          <span className="share-track"><i className="bar bar-p50" style={{ width: `${(n / max) * 100}%` }} /></span>
          <span className="mono share-n">{fmtInt(n)}<span className="muted"> · {Math.round((n / total) * 100)}%</span></span>
        </li>
      ))}
    </ul>
  )
}

export function SplitBar({ a, b, aLabel, bLabel, aClass = 'bar-p50', bClass = 'bar-p95' }: {
  a: number; b: number; aLabel: string; bLabel: string; aClass?: string; bClass?: string
}) {
  const t = a + b || 1
  return (
    <div>
      <div className="split" role="img" aria-label={`${aLabel} ${a}, ${bLabel} ${b}`}>
        {a > 0 && <i className={`bar ${aClass}`} style={{ flexGrow: a }} />}
        {b > 0 && <i className={`bar ${bClass}`} style={{ flexGrow: b }} />}
        {a + b === 0 && <i className="bar bar-none" style={{ flexGrow: 1 }} />}
      </div>
      <p className="legend">
        <span className={`key key-${aClass}`} />{aLabel} <b className="mono">{fmtInt(a)}</b> <span className="muted mono">{Math.round((a / t) * 100)}%</span>
        <span className={`key key-${bClass}`} />{bLabel} <b className="mono">{fmtInt(b)}</b> <span className="muted mono">{Math.round((b / t) * 100)}%</span>
      </p>
    </div>
  )
}

/* ---------- Timeseries: turns (bars) over total latency p50/p95 (lines). Two panels, one x axis, never dual-axis. ---------- */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const M = { l: 46, r: 14 }
function xLabel(t: string, bucket: 'hour' | 'day'): string {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  return bucket === 'hour' ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function TimeSeries({ data }: { data: Timeseries }) {
  const [ref, W] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const pts = data.points
  const n = pts.length
  const H1 = 96, H2 = 150, GAP = 26, AX = 22
  const innerW = Math.max(0, W - M.l - M.r)
  const step = n > 0 ? innerW / n : 0
  const cx = (i: number) => M.l + step * (i + 0.5)
  const maxTurns = niceMax(Math.max(1, ...pts.map((p) => p.turns)))
  const maxLat = niceMax(Math.max(1, ...pts.map((p) => Math.max(p.total_p95 ?? 0, p.total_p50 ?? 0))))
  const y1 = (v: number) => H1 - (v / maxTurns) * H1
  const y2 = (v: number) => H1 + GAP + H2 - (v / maxLat) * H2
  const totalH = H1 + GAP + H2 + AX
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))))

  const path = (key: 'total_p50' | 'total_p95') => {
    let d = ''
    let pen = false
    pts.forEach((p, i) => {
      const v = p[key]
      if (v == null) { pen = false; return }
      d += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)} ${y2(v).toFixed(1)}`
      pen = true
    })
    return d
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - r.left - M.l) / (step || 1))
    setHover(i >= 0 && i < n ? i : null)
  }
  const hp = hover != null ? pts[hover] : null
  const left = hover != null ? Math.min(Math.max(cx(hover), 90), W - 90) : 0

  return (
    <div ref={ref} className="ts">
      {W > 0 && n > 0 && (
        <>
          <svg width={W} height={totalH + 18} role="img" aria-label="Turnos y latencia total por intervalo" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <g transform="translate(0 18)">
            {[0, 0.5, 1].map((f) => (
              <g key={`a${f}`}>
                <line className="grid" x1={M.l} x2={W - M.r} y1={y1(maxTurns * f)} y2={y1(maxTurns * f)} />
                <text className="tick" x={M.l - 8} y={y1(maxTurns * f) + 3.5} textAnchor="end">{fmtInt(Math.round(maxTurns * f))}</text>
              </g>
            ))}
            {[0, 0.5, 1].map((f) => (
              <g key={`b${f}`}>
                <line className="grid" x1={M.l} x2={W - M.r} y1={y2(maxLat * f)} y2={y2(maxLat * f)} />
                <text className="tick" x={M.l - 8} y={y2(maxLat * f) + 3.5} textAnchor="end">{fmtMs(maxLat * f)}</text>
              </g>
            ))}
            {hover != null && <rect className="hover-band" x={M.l + step * hover} y={0} width={step} height={H1 + GAP + H2} />}
            {pts.map((p, i) => {
              const bw = Math.max(2, Math.min(28, step - 2))
              const h = H1 - y1(p.turns)
              return p.turns > 0 ? <rect key={p.t} className="ts-bar" x={cx(i) - bw / 2} y={y1(p.turns)} width={bw} height={h} rx={Math.min(3, bw / 2)} style={{ animationDelay: `${Math.min(i * 12, 240)}ms` }} /> : null
            })}
            <path className="line line-p95" d={path('total_p95')} />
            <path className="line line-p50" d={path('total_p50')} />
            {pts.map((p, i) => (
              <g key={`m${p.t}`}>
                {p.total_p95 != null && (hover === i || i === n - 1) && <circle className="dot dot-p95" cx={cx(i)} cy={y2(p.total_p95)} r={4} />}
                {p.total_p50 != null && (hover === i || i === n - 1) && <circle className="dot dot-p50" cx={cx(i)} cy={y2(p.total_p50)} r={4} />}
              </g>
            ))}
            {pts.map((p, i) => i % every === 0 && (
              <text key={`x${p.t}`} className="tick" x={cx(i)} y={totalH - 4} textAnchor="middle">{xLabel(p.t, data.bucket)}</text>
            ))}
            </g>
          </svg>
          <span className="ts-lab ts-lab-1">Turnos por {data.bucket === 'hour' ? 'hora' : 'día'}</span>
          <span className="ts-lab ts-lab-2">Latencia total</span>
          {hp && (
            <div className="tip" style={{ left, top: 0 }} role="status">
              <b className="mono">{xLabel(hp.t, data.bucket)}</b>
              <span>Turnos <b className="mono">{fmtInt(hp.turns)}</b></span>
              <span><i className="key key-p50" />p50 <b className="mono">{fmtMs(hp.total_p50)}</b></span>
              <span><i className="key key-p95" />p95 <b className="mono">{fmtMs(hp.total_p95)}</b></span>
            </div>
          )}
        </>
      )}
      <p className="legend"><span className="key key-p50" />Turnos (barras) · latencia total p50 <span className="key key-p95" />p95</p>
      <details className="as-table">
        <summary>Ver como tabla</summary>
        <div className="table-wrap"><table className="table"><thead><tr><th>Intervalo</th><th className="num">Turnos</th><th className="num">p50 total</th><th className="num">p95 total</th></tr></thead>
          <tbody>{pts.map((p) => <tr key={p.t}><td className="col-mono">{xLabel(p.t, data.bucket)}</td><td className="col-mono num">{p.turns}</td><td className="col-mono num">{fmtMs(p.total_p50)}</td><td className="col-mono num">{fmtMs(p.total_p95)}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  )
}
