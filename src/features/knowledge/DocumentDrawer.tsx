import { Link } from 'react-router-dom'
import { errorMessage } from '../../shared/api/client'
import type { KnowledgeDocument } from '../../shared/api/knowledge'
import { Badge, Banner, Loading } from '../../shared/ui'
import { Drawer } from '../../shared/ui/Drawer'
import { EmbeddedCell } from './DocumentsTable'
import { useDocument } from './useKnowledge'

export function DocumentDrawer({ doc, onClose }: { doc: KnowledgeDocument; onClose: () => void }) {
  const q = useDocument(doc.id)
  const d = q.data ?? doc
  const chunks = q.data?.preview ?? q.data?.chunks_preview ?? []
  return (
    <Drawer label={`Documento ${doc.title}`} eyebrow={<span className="mono">{d.document_type} · {d.language}</span>} title={d.title} onClose={onClose}>
      <div className="drawer-badges">
        {d.is_synthetic ? <Badge tone="info">Sintético</Badge> : <Badge>Real</Badge>}
        {d.license && <span className="tag">{d.license}</span>}
        {d.publisher && <span className="tag">{d.publisher}</span>}
      </div>
      {d.source_uri && <p className="doc-src"><code>{d.source_uri}</code></p>}
      <p className="doc-open"><Link className="btn btn-primary" to={`/conocimiento/${doc.id}`}>Abrir documento completo</Link></p>
      <section className="drawer-sec"><h4 className="eyebrow">Embeddings</h4><EmbeddedCell doc={d} /></section>
      <section className="drawer-sec">
        <h4 className="eyebrow">Vista previa de fragmentos (primeros 5)</h4>
        {q.isLoading && <Loading label="Leyendo fragmentos…" />}
        {q.error && <Banner tone="error">{errorMessage(q.error)}</Banner>}
        {q.data && (chunks.length ? (
          <ol className="chunks">
            {chunks.map((c) => (
              <li key={c.chunk_index} className="chunk">
                <div className="chunk-head"><span className="mono">#{c.chunk_index}</span>{(c.section ?? c.metadata?.section) && <span className="tag">{c.section ?? c.metadata?.section}</span>}</div>
                <p>{c.content}</p>
              </li>
            ))}
          </ol>
        ) : <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />Sin fragmentos para mostrar</div>)}
      </section>
    </Drawer>
  )
}
