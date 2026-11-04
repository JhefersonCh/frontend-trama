import type { ModelRole } from '../../../shared/api'

export const ROLES: { role: ModelRole; label: string; short: string; hint: string }[] = [
  { role: 'llm', label: 'LLM', short: 'LLM', hint: 'Modelo de lenguaje · razona y responde' },
  { role: 'embedding', label: 'Embeddings', short: 'Emb', hint: 'Vectores para buscar en el conocimiento' },
  { role: 'stt', label: 'STT', short: 'STT', hint: 'Voz a texto' },
  { role: 'tts', label: 'TTS', short: 'TTS', hint: 'Texto a voz' },
]

const nf = new Intl.NumberFormat('es-CO')
export const fmtMb = (v: number | null | undefined) => (v == null ? '—' : `${nf.format(v)} MB`)
export const fmtNum = (v: number) => nf.format(v)
