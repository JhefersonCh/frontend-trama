import type { Schedule, TechAvailability } from '../../shared/api/technicians'
import type { Tone } from '../../shared/ui'

export const AVAILABILITY: Record<TechAvailability, { label: string; tone: Tone }> = {
  disponible: { label: 'Disponible', tone: 'success' },
  ocupado: { label: 'Ocupado', tone: 'warning' },
  fuera_de_turno: { label: 'Fuera de turno', tone: 'neutral' },
  vacaciones: { label: 'Vacaciones', tone: 'info' },
}
export const availabilityOptions = (Object.keys(AVAILABILITY) as TechAvailability[]).map((v) => ({ value: v, label: AVAILABILITY[v].label }))
export const LEVELS = [{ value: 'n1', label: 'N1 · remoto' }, { value: 'n2', label: 'N2 · campo' }]

export const DAY_RANGES = [
  { value: 'lun-vie', label: 'Lunes a viernes' },
  { value: 'lun-sab', label: 'Lunes a sábado' },
  { value: 'lun-dom', label: 'Todos los días' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
]

export function fmtSchedule(s?: Schedule | null): string {
  const e = Object.entries(s ?? {})
  if (e.length === 0) return 'Sin turno definido'
  return e.map(([days, [a, b]]) => `${DAY_RANGES.find((d) => d.value === days)?.label ?? days} ${a}–${b}`).join(' · ')
}
