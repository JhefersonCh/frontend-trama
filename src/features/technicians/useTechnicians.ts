import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTechnician, deactivateTechnician, getWorkload, listTechnicians, updateTechnician, type TechnicianInput,
} from '../../shared/api/technicians'
import { useSettings } from '../config/settings/useSettings'

export const techKey = ['technicians'] as const

export const useTechnicians = () => useQuery({ queryKey: techKey, queryFn: listTechnicians, retry: false })
export const useWorkload = (id: string) => useQuery({ queryKey: ['technicians', 'workload', id], queryFn: () => getWorkload(id), retry: false })

export function useSaveTechnician(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TechnicianInput) => (id ? updateTechnician(id, body) : createTechnician(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: techKey }),
  })
}
export function useDeactivateTechnician() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateTechnician(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: techKey }),
  })
}

export const SPECIALTIES = [
  { value: 'fibra', label: 'Fibra' },
  { value: 'cobre_dsl', label: 'Cobre / DSL' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'redes', label: 'Redes' },
  { value: 'cableado', label: 'Cableado' },
  { value: 'equipos', label: 'Equipos' },
]
const FALLBACK_ZONES = ['mocoa', 'puerto_asis', 'sibundoy', 'orito', 'valle_del_guamuez', 'villagarzon']

/** Humanize a snake_case key ("puerto_asis" → "Puerto asis"). */
export const humanize = (k: string) => {
  const s = k.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const specialtyLabel = (k: string) => SPECIALTIES.find((s) => s.value === k)?.label ?? humanize(k)

/** Zones from settings (`zones`), falling back to the seeded list when unavailable. */
export function useZones(): string[] {
  const { data } = useSettings()
  const z = data?.zones
  return Array.isArray(z) && z.length > 0 ? z.filter((x): x is string => typeof x === 'string') : FALLBACK_ZONES
}
