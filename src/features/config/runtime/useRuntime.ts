import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRuntimeStatus, loadProfile, testProfile, unloadProfile } from '../../../shared/api/runtime'

export const runtimeKey = ['runtime', 'status'] as const

/** Polls every 5s; react-query pauses the interval while the browser tab is hidden. */
export function useRuntimeStatus() {
  return useQuery({
    queryKey: runtimeKey,
    queryFn: getRuntimeStatus,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}

export function useRuntimeActions() {
  const qc = useQueryClient()
  const sync = () => qc.invalidateQueries({ queryKey: runtimeKey })
  return {
    load: useMutation({
      mutationFn: (id: number | string) => loadProfile(id),
      onSuccess: (res) => { qc.setQueryData(runtimeKey, res); sync() },
    }),
    unload: useMutation({
      mutationFn: (id: number | string) => unloadProfile(id),
      onSuccess: (res) => { qc.setQueryData(runtimeKey, res); sync() },
    }),
    test: useMutation({
      mutationFn: (id: number | string) => testProfile(id),
      onSuccess: () => { sync(); qc.invalidateQueries({ queryKey: ['model-profiles'] }) },
    }),
  }
}

/** Human message for a LoadResult: evicted models + warnings. */
export function loadNotices(res: { evicted?: string[]; warning?: string | null }) {
  const out: { tone: 'info' | 'warning'; text: string }[] = []
  if (res.evicted?.length) out.push({ tone: 'info', text: `Se descargó ${res.evicted.join(', ')} para liberar memoria` })
  if (res.warning) {
    out.push({
      tone: 'warning',
      text: res.warning === 'exceeds_ram_budget' ? 'El modelo cargado excede el presupuesto de RAM. Puede ir lento o fallar.' : res.warning,
    })
  }
  return out
}
