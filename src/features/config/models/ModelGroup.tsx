import { Button } from '../../../shared/ui'
import type { ModelProfile, Provider } from '../../../shared/api'
import type { LoadedModel, TestResult } from '../../../shared/api/runtime'
import { fmtMb } from './roles'

export type RuntimeControls = {
  loaded: Map<string, LoadedModel>
  busy: { id: string; kind: 'load' | 'unload' | 'test' } | null
  tests: Record<string, TestResult | { error: string }>
  onLoad: (p: ModelProfile) => void
  onUnload: (p: ModelProfile) => void
  onTest: (p: ModelProfile) => void
}

function TestOutcome({ r }: { r: TestResult | { error: string } }) {
  if ('error' in r) return <p className="module-result is-fail" role="status">{r.error}</p>
  if (r.skipped) return <p className="module-result is-skip" role="status">Prueba omitida{r.detail ? ` · ${r.detail}` : ''}</p>
  return (
    <p className={`module-result${r.ok ? '' : ' is-fail'}`} role="status">
      <span>{r.ok ? 'OK' : 'Falló'}</span>
      {r.latency_ms != null && <span>Latencia <b>{Math.round(r.latency_ms)} ms</b></span>}
      {r.dimension != null && <span>Dimensión <b>{r.dimension}</b></span>}
      {r.measured_memory_mb != null && <span>Memoria <b>{fmtMb(r.measured_memory_mb)}</b></span>}
      {!r.ok && r.detail && <span>{r.detail}</span>}
    </p>
  )
}

export function ModelGroup({ label, short, hint, profiles, providers, activatingId, onActivate, onEdit, onDelete, runtime }: {
  label: string
  short?: string
  hint?: string
  profiles: ModelProfile[]
  providers: Provider[]
  activatingId?: ModelProfile['id'] | null
  onActivate: (p: ModelProfile) => void
  onEdit: (p: ModelProfile) => void
  onDelete: (p: ModelProfile) => void
  runtime?: RuntimeControls
}) {
  return (
    <section className="model-group" aria-label={label}>
      <header className="role-head">
        <span className="role-tag">{short ?? label}</span>
        <h3>{label}</h3>
        {hint && <span className="role-hint">{hint}</span>}
        <span className="role-count">{profiles.length} {profiles.length === 1 ? 'perfil' : 'perfiles'}</span>
      </header>
      {profiles.length === 0 ? (
        <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />Sin perfiles para este rol</div>
      ) : (
        <div className="modules">
          {profiles.map((p) => {
            const provider = providers.find((x) => x.id === p.provider_id)?.name ?? `#${p.provider_id}`
            const key = String(p.id)
            const live = runtime?.loaded.get(key)
            const busy = runtime?.busy?.id === key ? runtime.busy.kind : null
            const test = runtime?.tests[key]
            return (
              <article key={p.id} className={`module${p.is_active ? ' is-active' : ''}`} aria-label={p.name}>
                <header className="module-head">
                  <span className="led" data-on={p.is_active || undefined} aria-hidden="true" />
                  <h4 className="module-name">{p.name}</h4>
                  {p.is_active && <span className="module-flag">Activo</span>}
                </header>
                <code className="module-ref" title={p.model_ref}>{p.model_ref}</code>
                <dl className="module-specs">
                  <div><dt>Proveedor</dt><dd>{provider}</dd></div>
                  <div><dt>Mem. est.</dt><dd className="mono">{fmtMb(p.est_memory_mb)}</dd></div>
                  <div><dt>Medida</dt><dd className="mono">{fmtMb(p.measured_memory_mb)}</dd></div>
                </dl>
                {runtime && (
                  <div className="module-rt">
                    <div className="module-rt-row">
                      <span className={`rt-state${live ? ' is-loaded' : ''}`}>
                        <span className="led" data-on={live ? 'ok' : undefined} aria-hidden="true" />
                        {live ? `En memoria · ${live.source === 'manager' ? 'gestor' : 'externo'} · ${fmtMb(live.memory_mb)}` : 'No cargado'}
                      </span>
                      {live ? (
                        <Button size="sm" disabled={!!busy} onClick={() => runtime.onUnload(p)} aria-label={`Descargar ${p.name}`}>{busy === 'unload' ? 'Descargando…' : 'Descargar'}</Button>
                      ) : (
                        <Button size="sm" disabled={!!busy} onClick={() => runtime.onLoad(p)} aria-label={`Cargar ${p.name}`}>{busy === 'load' ? 'Cargando…' : 'Cargar'}</Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => runtime.onTest(p)} aria-label={`Probar ${p.name}`}>{busy === 'test' ? 'Probando…' : 'Probar'}</Button>
                    </div>
                    {test && <TestOutcome r={test} />}
                  </div>
                )}
                <footer className="module-actions">
                  {p.is_active ? (
                    <span className="module-online">En uso</span>
                  ) : (
                    <Button size="sm" className="btn-activate" disabled={activatingId === p.id} onClick={() => onActivate(p)} aria-label={`Activar ${p.name}`}>
                      {activatingId === p.id ? 'Activando…' : 'Activar'}
                    </Button>
                  )}
                  <span className="module-actions-end">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(p)} aria-label={`Editar ${p.name}`}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(p)} aria-label={`Eliminar ${p.name}`}>Eliminar</Button>
                  </span>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
