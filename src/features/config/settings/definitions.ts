export type FieldDef =
  | { name: string; label: string; kind: 'number' | 'text' | 'textarea' | 'boolean'; step?: number }

export interface SettingDef {
  key: string
  title: string
  fields: FieldDef[] // single field with name === '' => scalar value; otherwise object of named subfields
}

export const SETTING_DEFS: SettingDef[] = [
  { key: 'ram_budget_mb', title: 'Presupuesto de RAM', fields: [{ name: '', label: 'Presupuesto de RAM (MB)', kind: 'number' }] },
  { key: 'strict_single_model', title: 'Un modelo a la vez', fields: [{ name: '', label: 'Modo estricto: un solo modelo en memoria', kind: 'boolean' }] },
  { key: 'barge_in_min_ms', title: 'Interrupción (barge-in)', fields: [{ name: '', label: 'Voz mínima para interrumpir (ms)', kind: 'number' }] },
  { key: 'rag_top_k', title: 'RAG', fields: [{ name: '', label: 'Fragmentos recuperados (top-k)', kind: 'number' }] },
  {
    key: 'wake_word', title: 'Palabra de activación',
    fields: [
      { name: 'enabled', label: 'Habilitada', kind: 'boolean' },
      { name: 'phrase', label: 'Frase', kind: 'text' },
    ],
  },
  {
    key: 'vad', title: 'Detección de voz (VAD)',
    fields: [
      { name: 'positive_threshold', label: 'Umbral positivo', kind: 'number', step: 0.01 },
      { name: 'min_silence_ms', label: 'Silencio mínimo (ms)', kind: 'number' },
    ],
  },
  { key: 'system_prompt', title: 'Prompt del sistema', fields: [{ name: '', label: 'Prompt del sistema', kind: 'textarea' }] },
]
