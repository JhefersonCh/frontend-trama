export type ProviderKind = 'ollama' | 'llamacpp' | 'openai_compatible' | 'voice_service'
export type ModelRole = 'llm' | 'embedding' | 'stt' | 'tts'

export interface Provider {
  id: number | string
  name: string
  kind: ProviderKind
  base_url: string
  enabled: boolean
  has_secret: boolean
  created_at: string
  updated_at: string
}
export interface ProviderInput {
  name: string
  kind: ProviderKind
  base_url: string
  enabled?: boolean
}

export interface ModelProfile {
  id: number | string
  name: string
  role: ModelRole
  provider_id: number | string
  model_ref: string
  params: Record<string, unknown>
  est_memory_mb: number | null
  measured_memory_mb: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export interface ModelProfileInput {
  name: string
  role: ModelRole
  provider_id: number | string
  model_ref: string
  params?: Record<string, unknown>
  est_memory_mb?: number | null
}
export interface ActivateResult {
  profile: ModelProfile
  reindex_required: boolean
}

export type Settings = Record<string, unknown>

export interface AuditEntry {
  id: number | string
  entity: string
  entity_id: string | number | null
  action: string
  old_value: unknown
  new_value: unknown
  changed_at: string
}

export interface Health {
  status: string
  db: string
  http_ok: boolean
}
