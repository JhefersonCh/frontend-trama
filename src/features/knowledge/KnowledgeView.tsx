import { useState } from 'react'
import { errorMessage } from '../../shared/api/client'
import type { KnowledgeDocument } from '../../shared/api/knowledge'
import { Banner, Button, IconLayers, IconPlus, Loading, Modal, PageHeader, SectionHead } from '../../shared/ui'
import { GapsPanel } from './GapsPanel'
import { DocumentDrawer } from './DocumentDrawer'
import { DocumentsTable, needsReindex } from './DocumentsTable'
import { ReindexBar } from './ReindexBar'
import { SearchPanel } from './SearchPanel'
import { UploadModal } from './UploadModal'
import { useDocuments, useKnowledgeMutations } from './useKnowledge'
import './knowledge.css'

export function KnowledgeView() {
  const docs = useDocuments()
  const { remove } = useKnowledgeMutations()
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState<KnowledgeDocument | null>(null)
  const [deleting, setDeleting] = useState<KnowledgeDocument | null>(null)
  const stale = docs.data?.filter(needsReindex).length ?? 0

  return (
    <div className="view reveal">
      <PageHeader
        index="05" kicker="Base RAG" title="Conocimiento"
        actions={<Button variant="primary" onClick={() => setUploading(true)}><IconPlus size={16} />Subir documento</Button>}
      >
        Procedimientos y documentos que el agente consulta para responder con fuentes locales.
      </PageHeader>

      <ReindexBar staleDocs={stale} />

      <section>
        <SectionHead title="Documentos" meta={docs.data ? `${docs.data.length} · ${docs.data.reduce((s, d) => s + d.chunk_count, 0)} fragmentos` : undefined} />
        {docs.isLoading && <Loading label="Leyendo documentos…" />}
        {docs.error && <Banner tone="error">{errorMessage(docs.error)}</Banner>}
        {docs.data && (docs.data.length === 0 ? (
          <div className="bay bay-compact ticked">
            <div className="bay-icon"><IconLayers size={26} /></div>
            <p className="bay-tag"><span className="led led-off" aria-hidden="true" />Índice vacío</p>
            <h2 className="bay-title">Suba el primer documento</h2>
            <p className="page-desc">Acepta .md, .txt, .html y .jsonl. Se divide en fragmentos y se indexa con el modelo de embeddings activo.</p>
          </div>
        ) : (
          <DocumentsTable docs={docs.data} onOpen={setOpen} onDelete={setDeleting} />
        ))}
      </section>

      <SearchPanel />

      <GapsPanel />

      {uploading && <UploadModal onClose={() => setUploading(false)} />}
      {open && <DocumentDrawer doc={open} onClose={() => setOpen(null)} />}
      {deleting && (
        <Modal title="Eliminar documento" onClose={() => { setDeleting(null); remove.reset() }}>
          <p className="confirm-text">¿Eliminar <strong>{deleting.title}</strong> y sus {deleting.chunk_count} fragmentos? Esta acción no se puede deshacer.</p>
          {remove.error && <Banner tone="error">{errorMessage(remove.error)}</Banner>}
          <div className="actions">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>Confirmar eliminación</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
