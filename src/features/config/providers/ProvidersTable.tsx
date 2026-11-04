import { Badge, Button, IconLock, Table } from '../../../shared/ui'
import type { Provider } from '../../../shared/api'
import { KIND_OPTIONS } from './ProviderForm'

export function ProvidersTable({ providers, onEdit, onDelete, onSecret }: {
  providers: Provider[]
  onEdit: (p: Provider) => void
  onDelete: (p: Provider) => void
  onSecret: (p: Provider) => void
}) {
  return (
    <Table
      rows={providers}
      rowKey={(p) => p.id}
      empty="No hay proveedores registrados"
      columns={[
        { header: 'Nombre', render: (p) => <span className="cell-strong">{p.name}</span> },
        { header: 'Tipo', render: (p) => <span className="tag">{KIND_OPTIONS.find((k) => k.value === p.kind)?.label ?? p.kind}</span> },
        { header: 'URL base', className: 'col-mono', render: (p) => <code className="clip" title={p.base_url}>{p.base_url}</code> },
        { header: 'Estado', render: (p) => <Badge led tone={p.enabled ? 'success' : 'neutral'}>{p.enabled ? 'Habilitado' : 'Deshabilitado'}</Badge> },
        { header: 'Credencial', render: (p) => (p.has_secret ? <Badge tone="accent" icon={<IconLock size={13} />}>Credencial configurada</Badge> : <span className="cell-dim">—</span>) },
        {
          header: 'Acciones',
          className: 'row-actions',
          render: (p) => (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(p)} aria-label={`Editar ${p.name}`}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => onSecret(p)} aria-label={`Credencial de ${p.name}`}>Credencial</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(p)} aria-label={`Eliminar ${p.name}`}>Eliminar</Button>
            </>
          ),
        },
      ]}
    />
  )
}
