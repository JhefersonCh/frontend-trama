import { render, screen, within } from '@testing-library/react'
import type { KnowledgeDocument } from '../../shared/api/knowledge'
import { DocumentsTable } from './DocumentsTable'

const doc = (over: Partial<KnowledgeDocument>): KnowledgeDocument => ({
  id: 1, title: 'Guía DHCP', publisher: null, document_type: 'guia', language: 'es', license: null,
  is_synthetic: false, source_uri: null, chunk_count: 10, embedded_count: 10, ingested_at: '2026-01-01T00:00:00Z', ...over,
})

describe('documents table', () => {
  it('flags "Requiere reindexar" only when embedded < chunks', () => {
    render(<DocumentsTable docs={[doc({ id: 1, title: 'Completo' }), doc({ id: 2, title: 'Parcial', embedded_count: 4 })]} onOpen={() => {}} onDelete={() => {}} />)
    const full = screen.getByText('Completo').closest('tr')!
    const partial = screen.getByText('Parcial').closest('tr')!
    expect(within(full).queryByText('Requiere reindexar')).toBeNull()
    expect(within(partial).getByText('Requiere reindexar')).toBeInTheDocument()
  })
})
