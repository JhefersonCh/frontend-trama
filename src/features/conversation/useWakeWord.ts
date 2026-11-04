import { useEffect, useRef, useState } from 'react'
import { MicError } from '../../shared/audio/voiceInput'
import { voskModelInstalled, WakeWordListener } from '../../shared/audio/wakeWord'

export type WakeStatus = 'off' | 'checking' | 'loading' | 'listening' | 'missing' | 'error'

/**
 * Passive listening for the wake phrase. Runs only while `armed` is true and
 * voice mode is off (the two never hold the mic at the same time).
 */
export function useWakeWord({ phrase, armed, voiceActive, onWake }: {
  phrase: string; armed: boolean; voiceActive: boolean; onWake: () => void
}) {
  const [status, setStatus] = useState<WakeStatus>('off')
  const [error, setError] = useState<string | null>(null)
  const onWakeRef = useRef(onWake)
  useEffect(() => { onWakeRef.current = onWake }, [onWake])

  useEffect(() => {
    if (!armed || voiceActive) { setStatus('off'); return }
    let cancelled = false
    let listener: WakeWordListener | null = null
    setError(null)
    setStatus('checking')
    void (async () => {
      if (!(await voskModelInstalled())) { if (!cancelled) setStatus('missing'); return }
      if (cancelled) return
      setStatus('loading')
      try {
        const l = await WakeWordListener.start(phrase, () => {
          l.stop()
          onWakeRef.current()
        })
        if (cancelled) { l.stop(); return }
        listener = l
        setStatus('listening')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof MicError ? err.message : `No se pudo cargar el modelo de activación${err instanceof Error ? `: ${err.message}` : '.'}`)
      }
    })()
    return () => {
      cancelled = true
      listener?.stop()
    }
  }, [armed, voiceActive, phrase])

  return { status, error }
}
