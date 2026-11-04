import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProvider, deleteProvider, listProviders, removeProviderSecret, setProviderSecret, updateProvider,
  type Provider, type ProviderInput,
} from '../../../shared/api'

export const providersKey = ['providers'] as const

export function useProviders() {
  return useQuery({ queryKey: providersKey, queryFn: listProviders })
}

export function useProviderMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: providersKey })
  return {
    save: useMutation({
      mutationFn: ({ id, body }: { id?: Provider['id']; body: ProviderInput }) =>
        id === undefined ? createProvider(body) : updateProvider(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: Provider['id']) => deleteProvider(id), onSuccess: invalidate }),
    setSecret: useMutation({
      mutationFn: ({ id, value }: { id: Provider['id']; value: string }) => setProviderSecret(id, value),
      onSuccess: invalidate,
    }),
    removeSecret: useMutation({ mutationFn: (id: Provider['id']) => removeProviderSecret(id), onSuccess: invalidate }),
  }
}
