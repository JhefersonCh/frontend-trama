import { API_BASE, request } from './client'

export interface KnowledgeDocument {
  id: number | string
  title: string
  publisher?: string | null
  document_type: string
  language: string
  license?: string | null
  is_synthetic: boolean
  source_uri?: string | null
  chunk_count: number
  embedded_count: number
  ingested_at: string
}
export interface ChunkPreview { id?: string; chunk_index: number; section?: string | null; content: string; metadata?: { section?: string | null } }
/** The backend sends `preview`; `chunks_preview` is kept for older payloads. */
export interface KnowledgeDocumentDetail extends KnowledgeDocument { preview?: ChunkPreview[] | null; chunks_preview?: ChunkPreview[] | null }

/** Section (chunk) of a document with its char offsets inside `full_text` (null when not locatable). */
export interface ContentSection { chunk_index: number; section?: string | null; start: number | null; end: number | null }
export interface DocumentContent {
  id: KnowledgeDocument['id']
  title: string
  source_uri?: string | null
  publisher?: string | null
  document_type?: string | null
  language: string
  license?: string | null
  is_synthetic: boolean
  full_text: string
  sections: ContentSection[]
}

export interface UploadMeta {
  title: string
  publisher?: string
  source_uri?: string
  document_type: string
  license?: string
  language: string
  is_synthetic: boolean
}
export interface UploadResult {
  document: KnowledgeDocument
  chunks: number
  embedded: number
  warning?: string | null
}

export interface SearchHit {
  chunk_id: number | string
  document_id: number | string
  title: string
  content: string
  source_uri?: string | null
  section?: string | null
  score: number
  is_synthetic: boolean
}

export type ReindexStatus = 'pending' | 'running' | 'completed' | 'done' | 'failed' | string
export interface ReindexJob {
  id: number | string
  status: ReindexStatus
  progress: number | null
  from_profile_id?: number | string | null
  to_profile_id?: number | string | null
  started_at?: string | null
  finished_at?: string | null
  error?: string | null
}

export const listDocuments = () => request<KnowledgeDocument[]>(`${API_BASE}/knowledge/documents`)
export const getDocument = (id: KnowledgeDocument['id']) =>
  request<KnowledgeDocumentDetail>(`${API_BASE}/knowledge/documents/${id}`)
export const getDocumentContent = (id: KnowledgeDocument['id']) =>
  request<DocumentContent>(`${API_BASE}/knowledge/documents/${id}/content`)
export const deleteDocument = (id: KnowledgeDocument['id']) =>
  request<void>(`${API_BASE}/knowledge/documents/${id}`, { method: 'DELETE' })

export function uploadDocument(file: File, meta: UploadMeta) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', meta.title)
  fd.append('document_type', meta.document_type)
  fd.append('language', meta.language)
  fd.append('is_synthetic', String(meta.is_synthetic))
  if (meta.publisher) fd.append('publisher', meta.publisher)
  if (meta.source_uri) fd.append('source_uri', meta.source_uri)
  if (meta.license) fd.append('license', meta.license)
  return request<UploadResult>(`${API_BASE}/knowledge/documents`, { method: 'POST', body: fd })
}

export const searchKnowledge = (query: string, top_k = 5) =>
  request<SearchHit[]>(`${API_BASE}/knowledge/search`, { method: 'POST', json: { query, top_k } })

export const startReindex = () => request<ReindexJob>(`${API_BASE}/knowledge/reindex`, { method: 'POST' })
export const getReindex = (id: ReindexJob['id']) => request<ReindexJob>(`${API_BASE}/knowledge/reindex/${id}`)
export const getLatestReindex = () => request<ReindexJob>(`${API_BASE}/knowledge/reindex/latest`)
