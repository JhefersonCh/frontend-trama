import { API_BASE, request } from './client'

export type ToolKind = 'builtin' | 'static_template' | 'rag_search' | 'sql_readonly' | 'http_request' | 'client_tool'

export interface JsonSchema {
  type: 'object'
  properties?: Record<string, { type?: string; description?: string; enum?: unknown[]; [k: string]: unknown }>
  required?: string[]
  [k: string]: unknown
}

export interface ToolUsage { calls: number; errors: number; last_used_at: string | null }

export interface Tool {
  id: string
  name: string
  kind: ToolKind
  description: string
  params_schema: JsonSchema
  config: Record<string, unknown>
  intents: string[]
  enabled: boolean
  version: number
  updated_at: string
  usage: ToolUsage
}

export interface ToolInput {
  name: string
  kind: ToolKind
  description: string
  params_schema: JsonSchema
  config: Record<string, unknown>
  intents: string[]
  enabled: boolean
}
export type ToolPatch = Partial<Pick<ToolInput, 'description' | 'params_schema' | 'config' | 'intents' | 'enabled'>>

export interface ToolTestResult { ok: boolean; output: unknown; duration_ms: number; error: string | null }
export interface ToolVersion { version: number; snapshot: Record<string, unknown>; created_at: string }

const url = (id?: string, tail = '') => `${API_BASE}/tools${id ? `/${encodeURIComponent(id)}` : ''}${tail}`

export const listTools = () => request<Tool[]>(url())
export const createTool = (body: ToolInput) => request<Tool>(url(), { method: 'POST', json: body })
export const patchTool = (id: string, body: ToolPatch) => request<Tool>(url(id), { method: 'PATCH', json: body })
export const toggleTool = (id: string) => request<Tool>(url(id, '/toggle'), { method: 'POST' })
export const testTool = (id: string, args: Record<string, unknown>) =>
  request<ToolTestResult>(url(id, '/test'), { method: 'POST', json: { args } })
export const listToolVersions = (id: string) => request<ToolVersion[]>(url(id, '/versions'))
