import type { ModelRole } from '../../../shared/api'
import { Loading } from '../../../shared/ui'
import '../runtime/runtime.css'
import { useRuntimeStatus } from '../runtime/useRuntime'
import { useSettings } from '../settings/useSettings'
import { fmtMb, fmtNum, ROLES } from './roles'
import { useModelProfiles } from './useModels'

type Segment = { role: ModelRole; short: string; label: string; name: string | null; mb: number | null }

function toBudget(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Two rows against settings.ram_budget_mb: EST (active profiles' est_memory_mb) and REAL (runtime used_mb, when available). */
export function RamBudgetMeter() {
  const models = useModelProfiles()
  const settings = useSettings()
  const runtime = useRuntimeStatus()

  if (models.isLoading || settings.isLoading) return <section className="meter"><Loading label="Leyendo memoria…" /></section>
  const data = models.data
  if (!data) return null

  const segments: Segment[] = ROLES.map(({ role, short, label }) => {
    const p = data.find((m) => m.role === role && m.is_active)
    return { role, short, label, name: p?.name ?? null, mb: p ? (p.est_memory_mb ?? p.measured_memory_mb) : null }
  })
  const total = segments.reduce((s, x) => s + (x.mb ?? 0), 0)
  const budget = toBudget(settings.data?.ram_budget_mb) ?? toBudget(runtime.data?.ram_budget_mb)
  const rt = runtime.data
  const loaded = (rt?.loaded ?? []).filter((m) => (m.memory_mb ?? 0) > 0)
  const used = rt?.used_mb ?? 0
  const otherMb = Math.max(0, used - loaded.reduce((a, m) => a + (m.memory_mb ?? 0), 0))
  const scale = Math.max(budget ?? 0, total, used) || 1
  const over = budget != null && total > budget
  const realOver = budget != null && used > budget
  const pct = budget != null ? Math.round((total / budget) * 100) : null
  const pos = (v: number) => `${(v / scale) * 100}%`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(scale * f))

  return (
    <section className={`meter ticked${over ? ' is-over' : ''}${budget == null ? ' is-neutral' : ''}`} aria-labelledby="meter-title">
      <div className="meter-head">
        <div>
          <p className="eyebrow">Presupuesto de RAM</p>
          <h3 id="meter-title">Memoria de los modelos</h3>
        </div>
        <p className="meter-readout">
          <strong>{fmtNum(total)}</strong>
          <span title="Estimado de perfiles activos"> / {budget != null ? fmtNum(budget) : '—'} MB</span>
          {pct != null && <span className="meter-pct">{pct}%</span>}
        </p>
      </div>

      <div className="meter-row">
        <span className="meter-row-label">Est.</span>
        <div
          className="meter-track"
          role="img"
          aria-label={budget != null
            ? `Uso estimado ${fmtNum(total)} MB de ${fmtNum(budget)} MB${over ? ', excede el presupuesto' : ''}`
            : `Uso estimado ${fmtNum(total)} MB, sin presupuesto definido`}
        >
          {segments.filter((s) => (s.mb ?? 0) > 0).map((s) => (
            <div key={s.role} className={`meter-seg seg-${s.role}`} style={{ width: pos(s.mb!) }}>
              {s.mb! / scale > 0.07 && <span>{s.short}</span>}
            </div>
          ))}
          {over && <div className="meter-over" style={{ left: pos(budget!), width: pos(total - budget!) }} />}
          {budget != null && <div className="meter-limit" style={{ left: pos(budget) }} />}
        </div>
      </div>
      {rt && (
        <div className={`meter-row meter-row-real${realOver ? ' is-over' : ''}`}>
          <span className="meter-row-label">Real</span>
          <div
            className="meter-track"
            role="img"
            aria-label={`En memoria ahora ${fmtNum(used)} MB${budget != null ? ` de ${fmtNum(budget)} MB` : ''}${realOver ? ', excede el presupuesto' : ''}`}
          >
            {loaded.map((m) => (
              <div key={`${m.source}-${m.profile_id}`} className={`meter-seg seg-${m.role}`} style={{ width: pos(m.memory_mb!) }} title={m.name}>
                {m.memory_mb! / scale > 0.07 && <span>{ROLES.find((r) => r.role === m.role)?.short ?? m.role}</span>}
              </div>
            ))}
            {otherMb > 0 && <div className="meter-seg seg-other" style={{ width: pos(otherMb) }} title="Otros procesos" />}
            {realOver && <div className="meter-over" style={{ left: pos(budget!), width: pos(used - budget!) }} />}
            {budget != null && <div className="meter-limit" style={{ left: pos(budget) }} />}
          </div>
        </div>
      )}
      <div className="meter-scale" aria-hidden="true">
        {ticks.map((t, i) => <span key={i}>{fmtNum(t)}</span>)}
      </div>
      {rt && (
        <p className={`meter-real-read${realOver ? ' is-over' : ''}`}>
          En memoria ahora: <strong>{fmtMb(used)}</strong>{loaded.length === 0 && used === 0 ? ' · nada cargado' : ` · ${rt.loaded.length} ${rt.loaded.length === 1 ? 'modelo' : 'modelos'}`}
        </p>
      )}

      <ul className="meter-legend">
        {segments.map((s) => (
          <li key={s.role} className={s.name ? undefined : 'is-empty'}>
            <span className={`swatch seg-${s.role}`} aria-hidden="true" />
            <span className="legend-role">{s.short}</span>
            <span className="legend-name">{s.name ?? 'sin perfil activo'}</span>
            <span className="legend-mb">{s.name ? fmtMb(s.mb) : '—'}</span>
          </li>
        ))}
      </ul>

      {over ? (
        <p className="meter-msg msg-over" role="status">
          Excede el presupuesto por <strong>{fmtMb(total - budget!)}</strong>. Active perfiles más livianos o ajuste el presupuesto en Parámetros.
        </p>
      ) : budget == null ? (
        <p className="meter-msg">Sin presupuesto definido. Configure <code>ram_budget_mb</code> en Parámetros para comparar.</p>
      ) : (
        <p className="meter-msg msg-ok">Margen libre: <strong>{fmtMb(budget - total)}</strong></p>
      )}
    </section>
  )
}
