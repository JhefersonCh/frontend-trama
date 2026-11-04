import { API_BASE, ApiError, request, type ErrorDetail } from './client'
import type { ModelRole } from './types'

export interface LoadedModel {
  profile_id: number | string
  name: string
  role: ModelRole
  memory_mb: number | null
  source: 'manager' | 'external'
  last_used_at?: string | null
}
export interface RuntimeProvider {
  provider_id: number | string
  name: string
  kind: string
  reachable: boolean
  latency_ms: number | null
}
export interface RuntimeStatus {
  ram_budget_mb: number | null
  strict_single_model: boolean
  used_mb: number
  loaded: LoadedModel[]
  providers: RuntimeProvider[]
}
export type LoadResult = RuntimeStatus & { evicted?: string[]; warning?: string | null }
export interface TestResult {
  ok: boolean
  latency_ms: number | null
  detail?: string | null
  dimension?: number | null
  measured_memory_mb?: number | null
  skipped: boolean
}
export interface PullProgress { status?: string; completed?: number; total?: number }

export const getRuntimeStatus = () => request<RuntimeStatus>(`${API_BASE}/runtime/status`)
export const loadProfile = (id: number | string) =>
  request<LoadResult>(`${API_BASE}/runtime/profiles/${id}/load`, { method: 'POST' })
export const unloadProfile = (id: number | string) =>
  request<RuntimeStatus>(`${API_BASE}/runtime/profiles/${id}/unload`, { method: 'POST' })
export const testProfile = (id: number | string) =>
  request<TestResult>(`${API_BASE}/runtime/profiles/${id}/test`, { method: 'POST' })

function sseMessage(data: string): string {
  try {
    const j = JSON.parse(data)
    return j?.detail ?? j?.error ?? j?.message ?? data
  } catch {
    return data
  }
}

/** POST + SSE (not EventSource). Resolves on `event: done` / stream end, rejects on `event: error`. */
export async function pullModel(
  providerId: number | string,
  modelRef: string,
  onProgress: (p: PullProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/runtime/providers/${providerId}/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ model_ref: modelRef }),
    signal,
  })
  if (!res.ok || !res.body) {
    let detail: ErrorDetail = res.statusText || `HTTP ${res.status}`
    try { const b = await res.json(); if (b?.detail !== undefined) detail = b.detail } catch { /* not JSON */ }
    throw new ApiError(res.status, detail)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  const handle = (block: string): boolean => {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }
    const payload = data.join('\n')
    if (event === 'error') throw new Error(sseMessage(payload) || 'Error al descargar el modelo')
    if (event === 'done') return true
    if (!payload) return false
    try {
      const p = JSON.parse(payload) as PullProgress & { error?: string }
      if (p.error) throw new Error(p.error)
      onProgress(p)
    } catch (e) {
      if (e instanceof SyntaxError) return false
      throw e
    }
    return false
  }
  for (;;) {
    const { value, done } = await reader.read()
    buf += dec.decode(value, { stream: !done })
    const parts = buf.split(/\r?\n\r?\n/)
    buf = parts.pop() ?? ''
    for (const part of parts) if (handle(part)) return
    if (done) break
  }
  if (buf.trim()) handle(buf)
}
