import { useQuery } from '@tanstack/react-query'
import { useEffect, useId } from 'react'
import { getAgentCase } from '../../shared/api/cases'
import type { CaseView } from './conversationReducer'

const STATE_LABEL: Record<string, string> = {
  nuevo: 'Nuevo',
  entendiendo: 'Entendiendo',
  diagnosticando: 'Diagnosticando',
  intentando_solucion: 'Probando solución',
  verificando: 'Verificando',
  resuelto: 'Resuelto ✓',
  escalado: 'Escalado',
  seguimiento: 'En seguimiento',
  cerrado: 'Cerrado',
}

const ticketOf = (t: unknown): string | null =>
  typeof t === 'string' ? t : t && typeof t === 'object' && typeof (t as { ticket_number?: unknown }).ticket_number === 'string'
    ? (t as { ticket_number: string }).ticket_number : null

/** Map a certainty factor (-1..1) to a 0..1 meter fill. */
const fill = (cf: number) => Math.max(0, Math.min(1, (cf + 1) / 2))

/**
 * Discreet case lifecycle chip. Live data comes from `case_update`; the case
 * is also fetched on load (404 = no case yet → nothing is shown).
 */
export function CaseChip({ sessionId, live }: { sessionId: string | null; live: CaseView | null }) {
  const tipId = useId()
  const q = useQuery({
    queryKey: ['agent-case', sessionId],
    queryFn: () => getAgentCase(sessionId as string),
    enabled: !!sessionId,
    retry: false,
    staleTime: 30_000,
  })
  // The ticket number is not part of case_update: refetch when the state changes.
  const liveState = live?.state
  const refetch = q.refetch
  useEffect(() => {
    if (liveState && sessionId) void refetch()
  }, [liveState, sessionId, refetch])

  const rest = q.data
  const state = live?.state ?? rest?.state
  if (!state) return null
  const hyps = (live?.hypotheses ?? rest?.hypotheses?.filter((h) => h.status !== 'descartada') ?? [])
    .slice().sort((a, b) => b.cf - a.cf)
  const top = hyps[0]
  const ticket = ticketOf(rest?.ticket)
  const label = state === 'escalado' && ticket ? `Escalado · ${ticket}` : (STATE_LABEL[state] ?? state)
  const verified = live?.verified ?? rest?.verified

  return (
    <span className="cv-case" data-state={state}>
      <button type="button" className="cv-case-btn" aria-describedby={tipId}>
        <span className="cv-case-state">{label}</span>
        {top && (
          <>
            <span className="cv-case-top clip">{top.label ?? top.key}</span>
            <span className="cv-case-meter" role="meter" aria-label={`Certeza de ${top.label ?? top.key}`} aria-valuemin={-1} aria-valuemax={1} aria-valuenow={top.cf}>
              <span style={{ transform: `scaleX(${fill(top.cf)})` }} />
            </span>
          </>
        )}
      </button>
      <span className="cv-case-tip" role="tooltip" id={tipId}>
        <span className="cv-case-tip-h">Hipótesis del caso{verified ? ' · verificado' : ''}</span>
        {hyps.length === 0 ? (
          <span className="cv-case-none">Aún sin hipótesis.</span>
        ) : (
          <ol>
            {hyps.slice(0, 3).map((h) => (
              <li key={h.key}>
                <span className="clip">{h.label ?? h.key}</span>
                <span className="mono">{h.cf.toFixed(2)}</span>
                <span className="cv-case-meter" aria-hidden="true"><span style={{ transform: `scaleX(${fill(h.cf)})` }} /></span>
              </li>
            ))}
          </ol>
        )}
      </span>
    </span>
  )
}
