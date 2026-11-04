import { useState } from 'react'
import { Badge, Banner, Button, IconPlus, Loading, SectionHead, Table } from '../../../shared/ui'
import { errorMessage } from '../../../shared/api/client'
import type { Tool } from '../../../shared/api/tools'
import { fmtDate } from '../../tickets/meta'
import { ToolDrawer } from './ToolDrawer'
import { KIND, intentLabel } from './meta'
import { useToolMutations, useTools } from './useTools'
import './tools.css'

export function ToolsPanel() {
  const { data, isLoading, error } = useTools()
  const { toggle } = useToolMutations()
  const [editing, setEditing] = useState<Tool | 'new' | null>(null)
  const live = typeof editing === 'object' && editing ? data?.find((t) => t.id === editing.id) ?? editing : editing

  return (
    <section>
      <SectionHead title="Herramientas" meta={data ? `${data.filter((t) => t.enabled).length} activas de ${data.length}` : undefined}>
        <Button variant="primary" onClick={() => setEditing('new')}><IconPlus size={16} />Nueva herramienta</Button>
      </SectionHead>
      <p className="hint tl-intro">Lo que el agente puede consultar o ejecutar. Cada herramienta se ofrece al modelo solo en las intenciones indicadas.</p>
      {isLoading && <Loading />}
      {error && <Banner tone="error">{errorMessage(error)}</Banner>}
      {toggle.error && <Banner tone="error">{errorMessage(toggle.error)}</Banner>}
      {data && (
        <Table<Tool>
          rows={data}
          rowKey={(t) => t.id}
          empty="Todavía no hay herramientas registradas."
          columns={[
            {
              header: 'Activa',
              render: (t) => (
                <button type="button" role="switch" aria-checked={t.enabled} aria-label={`${t.enabled ? 'Desactivar' : 'Activar'} ${t.name}`}
                  className="tl-switch" disabled={toggle.isPending && toggle.variables === t.id} onClick={() => toggle.mutate(t.id)}><span /></button>
              ),
            },
            {
              header: 'Herramienta',
              render: (t) => (
                <div className="tl-name">
                  <button type="button" className="tl-link mono" onClick={() => setEditing(t)}>{t.name}</button>
                  <span className="clip muted">{t.description}</span>
                </div>
              ),
            },
            { header: 'Tipo', render: (t) => <Badge tone={KIND[t.kind].tone}>{KIND[t.kind].label}</Badge> },
            {
              header: 'Intenciones',
              render: (t) => t.intents.length === 0
                ? <span className="muted">—</span>
                : <span className="tl-chips">{t.intents.map((i) => <span key={i} className="tag">{intentLabel(i)}</span>)}</span>,
            },
            {
              header: 'Uso',
              className: 'col-mono',
              render: (t) => (
                <span title="Llamadas / con error">
                  {t.usage.calls}{t.usage.errors > 0 && <span className="tl-errs"> · {t.usage.errors} con error</span>}
                </span>
              ),
            },
            { header: 'Último uso', className: 'col-mono', render: (t) => fmtDate(t.usage.last_used_at) },
            { header: '', className: 'row-actions', render: (t) => <Button size="sm" onClick={() => setEditing(t)}>Editar</Button> },
          ]}
        />
      )}
      {live && <ToolDrawer key={live === 'new' ? 'new' : live.id} tool={live === 'new' ? undefined : live} onClose={() => setEditing(null)} />}
    </section>
  )
}
