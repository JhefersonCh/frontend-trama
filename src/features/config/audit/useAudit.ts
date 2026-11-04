import { useQuery } from '@tanstack/react-query'
import { listConfigAudit } from '../../../shared/api'

export function useAudit(limit = 50) {
  return useQuery({ queryKey: ['config-audit', limit], queryFn: () => listConfigAudit(limit) })
}
