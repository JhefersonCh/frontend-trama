import { API_BASE, request } from './client'

export interface RuleVersion { version: number; is_active: boolean; created_at?: string; name?: string; content_yaml?: string }
export interface RuleValidation { ok: boolean; errors: (string | { msg?: string; message?: string; line?: number })[] }

export const listRules = () => request<RuleVersion[]>(`${API_BASE}/rules`)
export const getRule = (version: number) => request<RuleVersion>(`${API_BASE}/rules/${version}`)
export const validateRules = (content_yaml: string) =>
  request<RuleValidation>(`${API_BASE}/rules/validate`, { method: 'POST', json: { content_yaml } })
export const createRule = (content_yaml: string) =>
  request<RuleVersion>(`${API_BASE}/rules`, { method: 'POST', json: { content_yaml } })
export const activateRule = (version: number) =>
  request<RuleVersion>(`${API_BASE}/rules/${version}/activate`, { method: 'POST' })
