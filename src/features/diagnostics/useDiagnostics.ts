import { useQuery } from '@tanstack/react-query'
import { getCase, listCases } from '../../shared/api/diagnostics'

export const useCases = () => useQuery({ queryKey: ['diagnostics', 'list'], queryFn: () => listCases(30), refetchInterval: 15000, refetchIntervalInBackground: false })
export const useCase = (id: string | undefined) =>
  useQuery({ queryKey: ['diagnostics', 'detail', id], queryFn: () => getCase(id!), enabled: !!id, retry: false })
