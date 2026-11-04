import { Badge, Banner, Loading, SectionHead, Table, type Tone } from '../../../shared/ui'
import { errorMessage } from '../../../shared/api'
import { useAudit } from './useAudit'

function actionTone(action: string): Tone {
  const a = action.toLowerCase()
  if (a.includes('delete') || a.includes('remove')) return 'danger'
  if (a.includes('create') || a.includes('insert')) return 'success'
  if (a.includes('activate')) return 'accent'
  return 'info'
}

const show = (v: unknown) => (v == null ? '—' : typeof v === 'string' ? v : JSON.stringify(v))

export function AuditPanel() {
  const { data, isLoading, error } = useAudit()
  return (
    <section>
      <SectionHead title="Auditoría" meta={data ? `últimos ${data.length} cambios` : undefined} />
      {isLoading && <Loading />}
      {error && <Banner tone="error">{errorMessage(error)}</Banner>}
      {data && (
        <Table
          rows={data}
          rowKey={(a) => a.id}
          empty="Sin cambios registrados"
          columns={[
            { header: 'Fecha', className: 'col-mono', render: (a) => new Date(a.changed_at).toLocaleString('es') },
            { header: 'Entidad', className: 'col-mono', render: (a) => `${a.entity}${a.entity_id != null ? ` #${a.entity_id}` : ''}` },
            { header: 'Acción', render: (a) => <Badge tone={actionTone(a.action)}>{a.action}</Badge> },
            { header: 'Antes', className: 'col-mono', render: (a) => <code className="clip">{show(a.old_value)}</code> },
            { header: 'Después', className: 'col-mono', render: (a) => <code className="clip">{show(a.new_value)}</code> },
          ]}
        />
      )}
    </section>
  )
}
