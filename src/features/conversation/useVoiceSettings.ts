import { useQuery } from '@tanstack/react-query'
import { getSettings, type Settings } from '../../shared/api'

export interface VoiceSettings {
  vad: { positiveThreshold: number; minSilenceMs: number }
  bargeInMinMs: number
  wakeWord: { enabled: boolean; phrase: string }
}

export const VOICE_DEFAULTS: VoiceSettings = {
  vad: { positiveThreshold: 0.5, minSilenceMs: 700 },
  bargeInMinMs: 350,
  wakeWord: { enabled: false, phrase: 'oye trama' },
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : d)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export function toVoiceSettings(s: Settings | undefined): VoiceSettings {
  if (!s) return VOICE_DEFAULTS
  const vad = obj(s.vad)
  const wake = obj(s.wake_word)
  return {
    vad: {
      positiveThreshold: num(vad.positive_threshold, VOICE_DEFAULTS.vad.positiveThreshold),
      minSilenceMs: num(vad.min_silence_ms, VOICE_DEFAULTS.vad.minSilenceMs),
    },
    bargeInMinMs: num(s.barge_in_min_ms, VOICE_DEFAULTS.bargeInMinMs),
    wakeWord: {
      enabled: wake.enabled === true,
      phrase: typeof wake.phrase === 'string' && wake.phrase.trim() ? wake.phrase.trim() : VOICE_DEFAULTS.wakeWord.phrase,
    },
  }
}

/** Shares the ['settings'] cache with the Configuración view. */
export function useVoiceSettings(): VoiceSettings {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: getSettings, staleTime: 30_000 })
  return toVoiceSettings(data)
}
