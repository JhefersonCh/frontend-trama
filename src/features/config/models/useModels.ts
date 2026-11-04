import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateModelProfile, createModelProfile, deleteModelProfile, listModelProfiles, updateModelProfile,
  type ModelProfile, type ModelProfileInput,
} from '../../../shared/api'

export const modelsKey = ['model-profiles'] as const

export function useModelProfiles() {
  return useQuery({ queryKey: modelsKey, queryFn: () => listModelProfiles() })
}

export function useModelMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: modelsKey })
  return {
    save: useMutation({
      mutationFn: ({ id, body }: { id?: ModelProfile['id']; body: ModelProfileInput }) =>
        id === undefined ? createModelProfile(body) : updateModelProfile(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: ModelProfile['id']) => deleteModelProfile(id), onSuccess: invalidate }),
    activate: useMutation({ mutationFn: (id: ModelProfile['id']) => activateModelProfile(id), onSuccess: invalidate }),
  }
}
