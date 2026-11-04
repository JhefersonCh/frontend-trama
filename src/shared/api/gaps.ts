import { API_BASE, request } from './client'

export type GapRange = '24h' | '7d' | '30d'
export interface KnowledgeGap {
  representative_query: string
  count: number
  last_seen: string
  examples: string[]
}

export const listKnowledgeGaps = (range: GapRange) =>
  request<KnowledgeGap[]>(`${API_BASE}/knowledge/gaps?range=${range}`)
