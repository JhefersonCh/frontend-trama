import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTool, listToolVersions, listTools, patchTool, testTool, toggleTool,
  type ToolInput, type ToolPatch,
} from '../../../shared/api/tools'

export const toolsKey = ['tools'] as const

export const useTools = () => useQuery({ queryKey: toolsKey, queryFn: listTools, retry: false })
export const useToolVersions = (id?: string) =>
  useQuery({ queryKey: ['tools', id, 'versions'], queryFn: () => listToolVersions(id!), enabled: !!id, retry: false })

export function useToolMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: toolsKey })
  return {
    save: useMutation({
      mutationFn: ({ id, body }: { id?: string; body: ToolInput | ToolPatch }) =>
        id ? patchTool(id, body as ToolPatch) : createTool(body as ToolInput),
      onSuccess: invalidate,
    }),
    toggle: useMutation({ mutationFn: (id: string) => toggleTool(id), onSuccess: invalidate }),
    test: useMutation({
      mutationFn: ({ id, args }: { id: string; args: Record<string, unknown> }) => testTool(id, args),
      onSettled: invalidate,
    }),
  }
}
