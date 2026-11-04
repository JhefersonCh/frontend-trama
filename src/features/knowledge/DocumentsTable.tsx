import type { KnowledgeDocument } from '../../shared/api/knowledge'
import { Badge, Button, Table } from '../../shared/ui'
import { Progress } from '../../shared/ui/Progress'

export const needsReindex = (d: Pick<KnowledgeDocument, 'chunk_count' | 'embedded_count'>) => d.embedded_count < d.chunk_count

export function EmbeddedCell({ doc }: { doc: KnowledgeDocument }) {
  const stale = needsReindex(doc)
  const ratio = doc.chunk_count > 0 ? doc.embedded_count / doc.chunk_count : 0
  return (
    <div className={`embed-cell${stale ? ' is-stale' : ''}`}>
      <div className="embed-nums">
        <span className="mono">{doc.embedded_count}/{doc.chunk_count}</span>
        {stale && <Badge tone="warning" led>Requiere reindexar</Badge>}
      </div>
      <Progress value={ratio} tone={stale ? 'warn' : 'ok'} label={`Embeddings de ${doc.title}`} />
    </div>
  )
}

export function DocumentsTable({ docs, onOpen, onDelete }: {
  docs: KnowledgeDocument[]
  onOpen: (d: KnowledgeDocument) => void
  onDelete: (d: KnowledgeDocument) => void
}) {
  return (
    <Table
      rows={docs}
      rowKey={(d) => d.id}
      empty="Aún no hay documentos en la base de conocimiento"
      columns={[
        { header: 'Documento', render: (d) => (
          <button type="button" className="doc-link" onClick={() => onOpen(d)} aria-label={`Ver ${d.title}`}>{d.title}</button>
        ) },
        { header: 'Tipo', render: (d) => <span className="tag">{d.document_type}</span> },
        { header: 'Idioma', className: 'col-mono', render: (d) => d.language },
        { header: 'Licencia', render: (d) => (d.license ? <span className="cell-dim-text">{d.license}</span> : <span className="cell-dim">—</span>) },
        { header: 'Origen', render: (d) => (d.is_synthetic ? <Badge tone="info">Sintético</Badge> : <span className="cell-dim">Real</span>) },
        { header: 'Fragmentos', className: 'col-mono', render: (d) => d.chunk_count },
        { header: 'Embeddings', render: (d) => <EmbeddedCell doc={d} /> },
        { header: 'Acciones', className: 'row-actions', render: (d) => (
          <Button size="sm" variant="danger" onClick={() => onDelete(d)} aria-label={`Eliminar ${d.title}`}>Eliminar</Button>
        ) },
      ]}
    />
  )
}
