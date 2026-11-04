import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../../shared/api/client'
import { listKnowledgeGaps, type GapRange, type KnowledgeGap } from '../../shared/api/gaps'
import { Banner, Loading, SectionHead } from '../../shared/ui'

const RANGES: GapRange[] = ['24h', '7d', '30d']
const when = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fmt = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : when.format(d) }

function Gap({ gap, i }: { gap: KnowledgeGap; i: number }) {
  const [open, setOpen] = useState(false)
  const has = gap.examples.length > 0
  return (
    <li className="gap" style={{ ['--i' as string]: Math.min(i, 8) }}>
      <div className="gap-row">
        <span className="gap-count mono" title="Veces que se preguntó sin encontrar fuentes">{gap.count}×</span>
        <div className="gap-main">
          <p className="gap-q">{gap.representative_query}</p>
          <p className="gap-meta">Última vez: {fmt(gap.last_seen)}</p>
        </div>
        {has && (
          <button type="button" className="gap-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Ocultar ejemplos' : `Ver ejemplos (${gap.examples.length})`}
          </button>
        )}
      </div>
      {has && (
        <div className="gap-ex" data-open={open || undefined}>
          <ul inert={!open}>
            {gap.examples.map((x, k) => <li key={k}>{x}</li>)}
          </ul>
        </div>
      )}
    </li>
  )
}

/** H1: questions the agent could not answer from the indexed documents. */
export function GapsPanel() {
  const [range, setRange] = useState<GapRange>('7d')
  const q = useQuery({ queryKey: ['knowledge', 'gaps', range], queryFn: () => listKnowledgeGaps(range), staleTime: 30_000 })
  const items = q.data ? [...q.data].sort((a, b) => b.count - a.count) : []
  return (
    <section className="gaps">
      <SectionHead title="Temas sin documentar" meta={q.data ? `${items.length} ${items.length === 1 ? 'tema' : 'temas'}` : undefined}>
        <div className="seg" role="group" aria-label="Rango de tiempo">
          {RANGES.map((r) => <button key={r} type="button" className="seg-btn" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
        </div>
      </SectionHead>
      <p className="gaps-desc">Preguntas frecuentes que el agente no pudo respaldar con ningún documento. Son buenos candidatos para el próximo material.</p>
      {q.isLoading && <Loading label="Buscando brechas…" />}
      {q.error && <Banner tone="error">{errorMessage(q.error)}</Banner>}
      {q.data && (items.length === 0 ? (
        <p className="gaps-empty"><span className="led" data-on="ok" aria-hidden="true" />Sin brechas detectadas</p>
      ) : (
        <ul className="gap-list">{items.map((g, i) => <Gap key={g.representative_query} gap={g} i={i} />)}</ul>
      ))}
    </section>
  )
}
