import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, putSetting } from '../../../shared/api'

export const settingsKey = ['settings'] as const

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: getSettings })
}

export function usePutSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => putSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKey }),
  })
}
