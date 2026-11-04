import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../../shared/api/client'
import { Badge, Banner, Button, Input, SectionHead } from '../../shared/ui'
import { useKnowledgeMutations } from './useKnowledge'

export function SearchPanel() {
  const [q, setQ] = useState('')
  const { search } = useKnowledgeMutations()
  const hits = search.data
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim()) search.mutate({ query: q.trim(), top_k: 5 }) }
  const needsReindexErr = search.error instanceof ApiError && search.error.status === 409

  return (
    <section className="search-panel" aria-label="Probar búsqueda">
      <SectionHead title="Probar búsqueda" meta="top 5 · similitud coseno" />
      <form className="search-form" onSubmit={submit} role="search">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. cómo renovar la IP por DHCP" aria-label="Consulta" />
        <Button type="submit" variant="primary" disabled={search.isPending || !q.trim()}>{search.isPending ? 'Buscando…' : 'Buscar'}</Button>
      </form>
      {search.error && <Banner tone={needsReindexErr ? 'warning' : 'error'}>{errorMessage(search.error)}</Banner>}
      {hits && (hits.length === 0 ? (
        <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />Sin resultados para esa consulta</div>
      ) : (
        <ol className="hits">
          {hits.map((h, i) => (
            <li key={h.chunk_id} className="hit" style={{ ['--i' as string]: i }}>
              <div className="hit-head">
                <span className="hit-rank mono">{String(i + 1).padStart(2, '0')}</span>
                <h4 className="hit-title">{h.title}</h4>
                {h.is_synthetic && <Badge tone="info">Sintético</Badge>}
                <span className="hit-score mono">{h.score.toFixed(3)}</span>
              </div>
              <div className="hit-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0, Math.min(1, h.score))})` }} /></div>
              <p className="hit-content">{h.content}</p>
              <p className="hit-meta">
                {h.section && <span className="tag">{h.section}</span>}
                {h.source_uri && <code className="clip" title={h.source_uri}>{h.source_uri}</code>}
              </p>
            </li>
          ))}
        </ol>
      ))}
    </section>
  )
}
