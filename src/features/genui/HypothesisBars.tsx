import { CfBar } from '../diagnostics/CfBar'
import { GuFrame } from './parts'
import type { HypothesisBarsProps } from './schema'
import type { GenUiComponentProps } from './types'

const STATUS_WORD: Record<string, string> = { aceptada: 'Aceptada', descartada: 'Descartada', viva: 'En evaluación' }
const cfStatus = (s: string) => (s === 'aceptada' || s === 'descartada' ? s : 'viva') as 'viva' | 'aceptada' | 'descartada'

/** Top hypotheses as certainty bars (−1…+1) with the accept/reject thresholds marked. */
export function HypothesisBars({ props, env }: GenUiComponentProps<HypothesisBarsProps>) {
  const items = [...props.items].sort((a, b) => b.cf - a.cf)
  const th = { accept: props.thresholds.accept, reject: props.thresholds.reject, explore_min: 0.4 }
  return (
    <GuFrame component="hypothesis_bars" eyebrow="Hipótesis" meta={<span className="mono">{items.length}</span>} label="Hipótesis del diagnóstico">
      <ul className="hb">
        {items.map((h, i) => (
          <li key={h.key} className="hb-row" data-status={cfStatus(h.status)} style={{ animationDelay: `${Math.min(i, 5) * 45}ms` }}>
            <div className="hb-top">
              <span className="hb-label">{h.label}</span>
              <span className="hb-word">{h.confidence_label}</span>
              <span className="hb-cf mono" aria-hidden="true">{h.cf >= 0 ? '+' : ''}{h.cf.toFixed(2)}</span>
              {env.interactive && (
                <button type="button" className="btn btn-ghost btn-sm hb-why" onClick={() => env.emit('why', { key: h.key })} aria-label={`¿Por qué ${h.label}?`}>
                  ¿Por qué?
                </button>
              )}
            </div>
            <CfBar cf={h.cf} label={`Certeza de ${h.label}: ${h.confidence_label}`} status={cfStatus(h.status)} thresholds={th} />
            {h.status !== 'viva' && <span className="hb-status">{STATUS_WORD[h.status] ?? h.status}</span>}
          </li>
        ))}
      </ul>
      <p className="hb-scale" aria-hidden="true"><span>−1 descartada</span><span>0</span><span>+1 confirmada</span></p>
    </GuFrame>
  )
}
