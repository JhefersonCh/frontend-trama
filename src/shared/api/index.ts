import { API_BASE, request } from './client'
import type {
  ActivateResult, AuditEntry, Health, ModelProfile, ModelProfileInput, ModelRole,
  Provider, ProviderInput, Settings,
} from './types'

export * from './client'
export * from './types'

// Providers
export const listProviders = () => request<Provider[]>(`${API_BASE}/providers`)
export const createProvider = (body: ProviderInput) =>
  request<Provider>(`${API_BASE}/providers`, { method: 'POST', json: body })
export const updateProvider = (id: Provider['id'], body: Partial<ProviderInput>) =>
  request<Provider>(`${API_BASE}/providers/${id}`, { method: 'PATCH', json: body })
export const deleteProvider = (id: Provider['id']) =>
  request<void>(`${API_BASE}/providers/${id}`, { method: 'DELETE' })
export const setProviderSecret = (id: Provider['id'], value: string) =>
  request<void>(`${API_BASE}/providers/${id}/secret`, { method: 'PUT', json: { value } })
export const removeProviderSecret = (id: Provider['id']) =>
  request<void>(`${API_BASE}/providers/${id}/secret`, { method: 'DELETE' })

// Model profiles
export const listModelProfiles = (role?: ModelRole) =>
  request<ModelProfile[]>(`${API_BASE}/model-profiles${role ? `?role=${role}` : ''}`)
export const createModelProfile = (body: ModelProfileInput) =>
  request<ModelProfile>(`${API_BASE}/model-profiles`, { method: 'POST', json: body })
export const updateModelProfile = (id: ModelProfile['id'], body: Partial<ModelProfileInput>) =>
  request<ModelProfile>(`${API_BASE}/model-profiles/${id}`, { method: 'PATCH', json: body })
export const deleteModelProfile = (id: ModelProfile['id']) =>
  request<void>(`${API_BASE}/model-profiles/${id}`, { method: 'DELETE' })
export const activateModelProfile = (id: ModelProfile['id']) =>
  request<ActivateResult>(`${API_BASE}/model-profiles/${id}/activate`, { method: 'POST' })

// Settings
export const getSettings = () => request<Settings>(`${API_BASE}/settings`)
export const putSetting = (key: string, value: unknown) =>
  request<{ key: string; value: unknown }>(`${API_BASE}/settings/${key}`, { method: 'PUT', json: { value } })

// Audit + health
export const listConfigAudit = (limit = 50) =>
  request<AuditEntry[]>(`${API_BASE}/config-audit?limit=${limit}`)
/** /health answers 503 with a body when the DB is down, so do not throw on !ok. */
export async function getHealth(): Promise<Health> {
  const res = await fetch('/health')
  let body: Partial<Health> = {}
  try { body = await res.json() } catch { /* not JSON */ }
  return { status: body.status ?? (res.ok ? 'ok' : 'degraded'), db: body.db ?? (res.ok ? 'ok' : 'error'), http_ok: res.ok }
}
