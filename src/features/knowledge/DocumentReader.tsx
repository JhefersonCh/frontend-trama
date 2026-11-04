import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../shared/api/client'
import type { DocumentContent } from '../../shared/api/knowledge'
import { Badge, Banner, Loading, PageHeader } from '../../shared/ui'
import { blockId, DocBlocks, parseBlocks } from '../conversation/rich'
import { useDocumentContent } from './useKnowledge'
import './knowledge.css'

const isPlain = (d: DocumentContent) => /rfc|txt|plain/i.test(d.document_type ?? '') || /^RFC\s?\d+/i.test(d.title)

export function DocumentReader() {
  const { docId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const q = useDocumentContent(docId)
  const d = q.data
  const chunkParam = params.get('chunk')
  const chunkIdx = chunkParam !== null && chunkParam !== '' && Number.isFinite(Number(chunkParam)) ? Number(chunkParam) : null
  const showChunks = params.get('vista') === 'fragmentos'
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  const blocks = useMemo(() => (d ? parseBlocks(d.full_text, isPlain(d)) : []), [d])
  const range = useMemo<[number, number] | null>(() => {
    const s = d?.sections.find((x) => x.chunk_index === chunkIdx)
    return s && s.start != null && s.end != null ? [s.start, s.end] : null
  }, [d, chunkIdx])
  const toc = useMemo(() => {
    const heads = blocks.flatMap((b) => (b.kind === 'heading' ? [{ id: blockId(b), text: b.text, level: b.level }] : []))
    if (heads.length || !d) return heads
    const seen = new Set<string>()
    return d.sections.flatMap((s) => {
      if (!s.section || s.start == null || seen.has(s.section)) return []
      seen.add(s.section)
      const b = blocks.find((x) => x.end > s.start!)
      return b ? [{ id: blockId(b), text: s.section, level: 1 }] : []
    })
  }, [blocks, d])

  // Jump to the cited chunk once the content is there.
  useEffect(() => {
    if (!d) return
    const t = window.setTimeout(() => {
      document.querySelector(showChunks ? '.rd-chunk[data-mark]' : '.rd-text [data-mark]')?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [d, chunkIdx, showChunks, reduced])

  const setView = (chunks: boolean) => {
    const next = new URLSearchParams(params)
    if (chunks) next.set('vista', 'fragmentos'); else next.delete('vista')
    setParams(next, { replace: true })
  }
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })

  return (
    <div className="view reveal doc-reader">
      <p className="rd-back"><Link className="turn-link" to="/conocimiento">← Conocimiento</Link></p>
      {q.isLoading && <Loading label="Abriendo documento…" />}
      {q.error && <Banner tone="error">{errorMessage(q.error)}</Banner>}
      {d && (
        <>
          <PageHeader kicker={`${d.document_type ?? 'Documento'} · ${d.language}`} title={d.title}>
            {d.publisher ? `Publicado por ${d.publisher}` : undefined}
          </PageHeader>
          <div className="drawer-badges">
            {d.is_synthetic ? <Badge tone="info">Sintético</Badge> : <Badge>Real</Badge>}
            {d.license && <span className="tag">{d.license}</span>}
            {d.source_uri && /^https?:\/\//.test(d.source_uri)
              ? <a className="turn-link" href={d.source_uri} target="_blank" rel="noreferrer noopener">Fuente original ↗</a>
              : d.source_uri && <code>{d.source_uri}</code>}
          </div>
          <div className="rd-toolbar" role="group" aria-label="Vista del documento">
            <button type="button" className="btn btn-ghost" aria-pressed={!showChunks} onClick={() => setView(false)}>Texto completo</button>
            <button type="button" className="btn btn-ghost" aria-pressed={showChunks} onClick={() => setView(true)}>Ver fragmentos</button>
          </div>
          <div className="rd-layout">
            {toc.length > 0 && (
              <nav className="rd-toc" aria-label="Contenido">
                <p className="eyebrow">Contenido</p>
                <ol>
                  {toc.map((t) => (
                    <li key={t.id} style={{ paddingLeft: `${Math.max(0, t.level - 1) * 0.7}rem` }}>
                      <a href={`#${t.id}`} onClick={(e) => { e.preventDefault(); goTo(t.id) }}>{t.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {showChunks ? (
              <ol className="chunks rd-chunks">
                {d.sections.map((s) => (
                  <li key={s.chunk_index} className="chunk rd-chunk" data-mark={s.chunk_index === chunkIdx || undefined}>
                    <div className="chunk-head"><span className="mono">#{s.chunk_index}</span>{s.section && <span className="tag">{s.section}</span>}</div>
                    <p>{s.start != null && s.end != null ? d.full_text.slice(s.start, s.end) : 'Fragmento no ubicable en el texto.'}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <article className="rd-text" aria-label="Texto del documento">
                {chunkIdx !== null && !range && <Banner tone="info">No se pudo ubicar el fragmento citado; se muestra el documento completo.</Banner>}
                <DocBlocks blocks={blocks} mark={range} />
              </article>
            )}
          </div>
        </>
      )}
    </div>
  )
}
