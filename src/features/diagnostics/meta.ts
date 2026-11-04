import type { CaseStatus, ObservationSource } from '../../shared/api/diagnostics'
import type { Tone } from '../../shared/ui'

export const CASE_STATUS: Record<CaseStatus, { label: string; tone: Tone }> = {
  en_curso: { label: 'En curso', tone: 'info' },
  escalado: { label: 'Escalado', tone: 'warning' },
  sin_actividad: { label: 'Sin actividad', tone: 'neutral' },
}
export const OBS_SOURCE: Record<ObservationSource, { label: string; tone: Tone }> = {
  user_provided: { label: 'Aportado por el usuario', tone: 'neutral' },
  lab_simulated: { label: 'Laboratorio', tone: 'accent' },
  server_view: { label: 'Vista del servidor', tone: 'success' },
}
export const KIND_LABEL: Record<string, string> = { user: 'Usuario', assistant: 'Agente', tool: 'Herramienta', sources: 'Fuentes', ticket: 'Ticket' }

export function fmtWhen(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins >= 0 && mins < 1) return 'ahora'
  if (mins >= 0 && mins < 60) return `hace ${mins} min`
  if (mins >= 0 && mins < 1440) return `hace ${Math.floor(mins / 60)} h`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}
export const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' })
}
export function fmtFact(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

import type { HypothesisStatus, LifecycleState, TracePhase } from '../../shared/api/cases'

export const LIFECYCLE: { key: LifecycleState; label: string }[] = [
  { key: 'nuevo', label: 'Nuevo' },
  { key: 'entendiendo', label: 'Entendiendo' },
  { key: 'diagnosticando', label: 'Diagnosticando' },
  { key: 'intentando_solucion', label: 'Intentando solución' },
  { key: 'verificando', label: 'Verificando' },
  { key: 'resuelto', label: 'Resuelto / escalado' },
  { key: 'seguimiento', label: 'Seguimiento' },
  { key: 'cerrado', label: 'Cerrado' },
]
export const lifecycleIndex = (s: LifecycleState) => (s === 'escalado' ? 5 : Math.max(0, LIFECYCLE.findIndex((l) => l.key === s)))
export const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  nuevo: 'Nuevo', entendiendo: 'Entendiendo', diagnosticando: 'Diagnosticando', intentando_solucion: 'Intentando solución',
  verificando: 'Verificando', resuelto: 'Resuelto', escalado: 'Escalado', seguimiento: 'Seguimiento', cerrado: 'Cerrado',
}
export const HYP_STATUS: Record<HypothesisStatus, { label: string; tone: Tone }> = {
  viva: { label: 'En evaluación', tone: 'info' },
  aceptada: { label: 'Aceptada', tone: 'success' },
  descartada: { label: 'Descartada', tone: 'neutral' },
}
export const PHASE_LABEL: Record<TracePhase, string> = {
  percibir: 'Percibir', creer: 'Creer', decidir: 'Decidir', actuar: 'Actuar', verificar: 'Verificar', proactivo: 'Proactivo',
}
export const FACT_SOURCE: Record<string, { label: string; tone: Tone }> = {
  user_reported: { label: 'Dicho por la persona', tone: 'neutral' },
  browser_measured: { label: 'Medido en el navegador', tone: 'success' },
  local_agent: { label: 'Agente local', tone: 'success' },
  router: { label: 'Router', tone: 'info' },
  public_api: { label: 'API pública', tone: 'info' },
  photo: { label: 'Foto', tone: 'accent' },
  technician: { label: 'Técnico', tone: 'accent' },
  system: { label: 'Sistema', tone: 'neutral' },
}
export const sourceMeta = (s?: string) => (s ? FACT_SOURCE[s] ?? { label: s, tone: 'neutral' as Tone } : null)
