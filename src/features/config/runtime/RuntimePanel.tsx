import { useState } from 'react'
import { errorMessage } from '../../../shared/api/client'
import type { RuntimeProvider } from '../../../shared/api/runtime'
import { Badge, Banner, Button, Loading, SectionHead, Table } from '../../../shared/ui'
import { fmtMb, ROLES } from '../models/roles'
import { RamBudgetMeter } from '../models/RamBudgetMeter'
import { PullModal } from './PullModal'
import { useRuntimeActions, useRuntimeStatus } from './useRuntime'
import './runtime.css'

function ago(iso?: string | null) {
  if (!iso) return '—'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (Number.isNaN(s)) return '—'
  if (s < 60) return `hace ${s} s`
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  return `hace ${Math.round(s / 3600)} h`
}

export function RuntimePanel() {
  const rt = useRuntimeStatus()
  const { unload } = useRuntimeActions()
  const [pulling, setPulling] = useState<RuntimeProvider | null>(null)
  const s = rt.data

  return (
    <section>
      <SectionHead title="Runtime" meta={s ? `${s.loaded.length} cargados · ${s.providers.filter((p) => p.reachable).length}/${s.providers.length} proveedores en línea` : undefined}>
        {s?.strict_single_model && <span className="tag" title="El gestor descarga el modelo previo antes de cargar otro">un modelo a la vez</span>}
      </SectionHead>

      <RamBudgetMeter />
      {rt.error && <Banner tone="error">No se pudo leer el estado del runtime: {errorMessage(rt.error)}</Banner>}
      {rt.isLoading && <Loading label="Leyendo runtime…" />}
      {unload.error && <Banner tone="error">{errorMessage(unload.error)}</Banner>}

      {s && (
        <>
          <h3 className="rt-h">Proveedores</h3>
          <div className="rt-providers">
            {s.providers.length === 0 && <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />Sin proveedores habilitados</div>}
            {s.providers.map((p) => (
              <article key={p.provider_id} className={`rt-prov ${p.reachable ? 'status-ok' : 'status-down'}`} aria-label={p.name}>
                <span className="led" aria-hidden="true" />
                <div className="rt-prov-main">
                  <h4>{p.name}</h4>
                  <span className="tag">{p.kind}</span>
                </div>
                <span className="rt-prov-lat mono">{p.reachable ? (p.latency_ms != null ? `${Math.round(p.latency_ms)} ms` : 'en línea') : 'sin respuesta'}</span>
                {p.kind === 'ollama' && (
                  <Button size="sm" disabled={!p.reachable} onClick={() => setPulling(p)} aria-label={`Descargar modelo en ${p.name}`}>Descargar modelo</Button>
                )}
              </article>
            ))}
          </div>

          <h3 className="rt-h">Modelos cargados</h3>
          <Table
            rows={s.loaded}
            rowKey={(m) => `${m.source}-${m.profile_id}`}
            empty="No hay modelos en memoria"
            columns={[
              { header: 'Modelo', render: (m) => <span className="cell-strong">{m.name}</span> },
              { header: 'Rol', render: (m) => <span className="role-tag">{ROLES.find((r) => r.role === m.role)?.short ?? m.role}</span> },
              { header: 'Origen', render: (m) => <Badge led tone={m.source === 'manager' ? 'accent' : 'neutral'}>{m.source === 'manager' ? 'Gestor' : 'Externo'}</Badge> },
              { header: 'Memoria', className: 'col-mono', render: (m) => fmtMb(m.memory_mb) },
              { header: 'Último uso', className: 'col-mono', render: (m) => ago(m.last_used_at) },
              { header: 'Acciones', className: 'row-actions', render: (m) => (
                <Button size="sm" variant="ghost" disabled={unload.isPending} onClick={() => unload.mutate(m.profile_id)} aria-label={`Descargar ${m.name} de memoria`}>Descargar</Button>
              ) },
            ]}
          />
        </>
      )}

      {pulling && <PullModal provider={pulling} onClose={() => setPulling(null)} onDone={() => rt.refetch()} />}
    </section>
  )
}
