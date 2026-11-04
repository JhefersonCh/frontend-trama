import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../shared/api/client'
import {
  deleteDocument, getDocument, getDocumentContent, getLatestReindex, listDocuments, searchKnowledge, startReindex, uploadDocument,
  type KnowledgeDocument, type ReindexJob, type UploadMeta,
} from '../../shared/api/knowledge'

const docsKey = ['knowledge', 'documents'] as const
const reindexKey = ['knowledge', 'reindex', 'latest'] as const

export const isJobRunning = (j?: ReindexJob | null) => !!j && (j.status === 'running' || j.status === 'pending' || j.status === 'queued')

export function useDocuments() {
  return useQuery({ queryKey: docsKey, queryFn: listDocuments })
}
export function useDocument(id: KnowledgeDocument['id']) {
  return useQuery({ queryKey: [...docsKey, id], queryFn: () => getDocument(id) })
}

export function useDocumentContent(id: KnowledgeDocument['id']) {
  return useQuery({ queryKey: [...docsKey, id, 'content'], queryFn: () => getDocumentContent(id) })
}

/** Latest reindex job; 404 (never ran) maps to null. Polls every 2s while the job is running. */
export function useLatestReindex() {
  return useQuery({
    queryKey: reindexKey,
    queryFn: async () => {
      try { return await getLatestReindex() } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    refetchInterval: (q) => (isJobRunning(q.state.data) ? 2000 : false),
  })
}

export function useRefreshDocsOnReindexDone(running: boolean) {
  const qc = useQueryClient()
  const was = useRef(false)
  useEffect(() => {
    if (was.current && !running) qc.invalidateQueries({ queryKey: docsKey })
    was.current = running
  }, [running, qc])
}

export function useKnowledgeMutations() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: docsKey })
  return {
    upload: useMutation({ mutationFn: ({ file, meta }: { file: File; meta: UploadMeta }) => uploadDocument(file, meta), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: KnowledgeDocument['id']) => deleteDocument(id), onSuccess: refresh }),
    search: useMutation({ mutationFn: ({ query, top_k }: { query: string; top_k?: number }) => searchKnowledge(query, top_k) }),
    reindex: useMutation({
      mutationFn: startReindex,
      onSuccess: (job) => { qc.setQueryData(reindexKey, job) },
    }),
  }
}
