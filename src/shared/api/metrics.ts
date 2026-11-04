import { API_BASE, request } from './client'

export type MetricsRange = '24h' | '7d' | '30d'
export interface Pctl { p50: number | null; p95: number | null }
export type Stage = 'stt' | 'rag' | 'llm_first_token' | 'tts_first_audio' | 'total'

export interface MetricsSummary {
  range: MetricsRange
  turns: { total: number; by_intent: Record<string, number>; by_mode: { text: number; voice: number }; interrupted: number }
  latency_ms: Record<Stage, Pctl>
  tokens: { prompt_avg: number | null; cached_avg: number | null; completion_avg: number | null; cache_hit_ratio: number | null }
  rag: { turns_with_sources: number; no_context_turns: number; avg_top_score: number | null }
  quality: { voseo_hits: number; citations_removed: number; final_text_rewrites: number; length_cutoffs: number }
  tools: { name: string; calls: number; ok: number; errors: number; avg_ms: number | null }[]
  model_loads: { profile: string; role: string; loads: number; evictions: number; errors: number; avg_ms: number | null }[]
  tickets: { open: number; in_progress: number; resolved: number; closed: number; created_in_range: number }
  sessions: { in_range: number }
}
export interface TimePoint { t: string; turns: number; total_p50: number | null; total_p95: number | null; llm_first_token_p50: number | null }
export interface Timeseries { bucket: 'hour' | 'day'; points: TimePoint[] }
export interface RecentTurn {
  created_at: string; session_id: string; session_title: string | null; intent: string | null; input_mode: 'text' | 'voice' | string
  model: string | null; total_ms: number | null; llm_first_token_ms: number | null; rag_ms: number | null
  sources_count: number; tool_calls: number; finish_reason: string | null; interrupted: boolean; voseo_hits: number
}

export const getMetricsSummary = (range: MetricsRange) => request<MetricsSummary>(`${API_BASE}/metrics/summary?range=${range}`)
export const getMetricsTimeseries = (range: MetricsRange) => request<Timeseries>(`${API_BASE}/metrics/timeseries?range=${range}`)
export const getRecentTurns = (limit = 50) => request<RecentTurn[]>(`${API_BASE}/metrics/turns?limit=${limit}`)
