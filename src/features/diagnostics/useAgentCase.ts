import { useQuery } from '@tanstack/react-query'
import { explainCase, getAgentCase } from '../../shared/api/cases'

export const useAgentCase = (id: string) =>
  useQuery({ queryKey: ['cases', id], queryFn: () => getAgentCase(id), retry: false, refetchInterval: 10000, refetchIntervalInBackground: false })
export const useExplain = (id: string, target: string | null) =>
  useQuery({ queryKey: ['cases', id, 'explain', target], queryFn: () => explainCase(id, target!), enabled: !!target, retry: false, staleTime: 30000 })
