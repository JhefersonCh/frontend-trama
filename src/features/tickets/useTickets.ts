import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addTicketNote, assignTicket, createTicket, getTicket, getTimeline, listTickets, patchTicket,
  type TicketDetail, type TicketFilters, type TicketInput, type TicketPriority, type TicketStatus, type TicketSummary,
} from '../../shared/api/tickets'

const detailKey = (n: string) => ['tickets', 'detail', n] as const
const timelineKey = (n: string) => ['tickets', 'timeline', n] as const

export function useTicketList(f: TicketFilters) {
  return useQuery({
    queryKey: ['tickets', 'list', f.status ?? '', f.technicianId ?? '', !!f.unassigned],
    queryFn: () => listTickets(f),
  })
}

export function useTicketDetail(n: string) {
  return useQuery({ queryKey: detailKey(n), queryFn: () => getTicket(n) })
}

/** Timeline + SLA + technician + handoff. Optional: a 404 just means the backend piece is not there yet. */
export function useTicketTimeline(n: string) {
  return useQuery({ queryKey: timelineKey(n), queryFn: () => getTimeline(n), retry: false })
}

type Patch = { status?: TicketStatus; priority?: TicketPriority }

/** PATCH with optimistic UI: list rows and detail update immediately, rolled back on error. */
export function usePatchTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ n, patch }: { n: string; patch: Patch }) => patchTicket(n, patch),
    onMutate: async ({ n, patch }) => {
      await qc.cancelQueries({ queryKey: ['tickets'] })
      const lists = qc.getQueriesData<TicketSummary[]>({ queryKey: ['tickets', 'list'] })
      const detail = qc.getQueryData<TicketDetail>(detailKey(n))
      qc.setQueriesData<TicketSummary[]>({ queryKey: ['tickets', 'list'] }, (old) =>
        old?.map((t) => (t.ticket_number === n ? { ...t, ...patch } : t)))
      qc.setQueryData<TicketDetail>(detailKey(n), (old) => (old ? { ...old, ...patch } : old))
      return { lists, detail }
    },
    onError: (_e, { n }, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data))
      if (ctx?.detail) qc.setQueryData(detailKey(n), ctx.detail)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TicketInput) => createTicket(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
}

export function useAssignTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ n, body }: { n: string; body: { technician_id: string } | { auto: true } }) => assignTicket(n, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); qc.invalidateQueries({ queryKey: ['technicians'] }) },
  })
}

export function useAddNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ n, technician_id, text }: { n: string; technician_id: string; text: string }) => addTicketNote(n, { technician_id, text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
}
