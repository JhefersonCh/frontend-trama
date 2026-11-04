import { errorMessage } from '../../shared/api/client'
import { Banner, Button } from '../../shared/ui'
import { Progress } from '../../shared/ui/Progress'
import { isJobRunning, useKnowledgeMutations, useLatestReindex, useRefreshDocsOnReindexDone } from './useKnowledge'

export function ReindexBar({ staleDocs }: { staleDocs: number }) {
  const latest = useLatestReindex()
  const { reindex } = useKnowledgeMutations()
  const job = latest.data
  const running = isJobRunning(job)
  useRefreshDocsOnReindexDone(running)
  const failed = job?.status === 'failed'
  const pct = job?.progress != null ? (job.progress > 1 ? job.progress / 100 : job.progress) : 0

  return (
    <section className={`reindex ticked${running ? ' is-running' : ''}${staleDocs > 0 && !running ? ' is-stale' : ''}`} aria-label="Reindexado">
      <div className="reindex-main">
        <span className="led" data-on={running || undefined} aria-hidden="true" />
        <div>
          <p className="eyebrow">Índice de embeddings</p>
          <p className="reindex-state">
            {running ? 'Reindexando…'
              : failed ? 'El último reindexado falló'
              : staleDocs > 0 ? `${staleDocs} ${staleDocs === 1 ? 'documento requiere' : 'documentos requieren'} reindexar`
              : 'Índice al día'}
          </p>
        </div>
        <Button variant={staleDocs > 0 && !running ? 'primary' : 'secondary'} disabled={running || reindex.isPending} onClick={() => reindex.mutate()}>
          {running || reindex.isPending ? 'En curso…' : 'Reindexar'}
        </Button>
      </div>
      {running && (
        <div className="reindex-prog">
          <Progress value={pct} label="Progreso del reindexado" indeterminate={job?.progress == null} />
          <span className="mono">{Math.round(pct * 100)}%</span>
        </div>
      )}
      {failed && job?.error && <p className="reindex-err">{job.error}</p>}
      {reindex.error && <Banner tone="error">{errorMessage(reindex.error)}</Banner>}
    </section>
  )
}
