import { useCallback, useEffect, useRef, useState } from 'react'
import { ChunkPlayer } from '../../shared/audio/player'
import { MicError, openMic, VoiceInput } from '../../shared/audio/voiceInput'
import { arrayBufferToBase64, encodeWavPcm16 } from '../../shared/audio/wav'
import type { Conversation } from './useConversation'
import type { VoiceSettings } from './useVoiceSettings'

export type VoiceStatus = 'off' | 'starting' | 'on'

/** Extra VAD threshold while TTS plays: residual echo rarely clears it, a real voice does. */
const PLAYBACK_THRESHOLD_BOOST = 0.15

interface Segment {
  active: boolean
  duringPlayback: boolean
  speechMs: number
  bargedIn: boolean
}

/**
 * Continuous voice mode: mic → VAD → audio_segment, seq-ordered TTS playback,
 * and barge-in (sustained speech while the agent talks cuts it off).
 */
export function useVoiceMode(conv: Conversation, settings: VoiceSettings) {
  const [status, setStatus] = useState<VoiceStatus>('off')
  const [playing, setPlaying] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const inputRef = useRef<VoiceInput | null>(null)
  const playerRef = useRef<ChunkPlayer | null>(null)
  const seg = useRef<Segment>({ active: false, duringPlayback: false, speechMs: 0, bargedIn: false })
  const levelEl = useRef<SVGCircleElement | null>(null)
  const startToken = useRef(0)

  // Latest values for audio callbacks (they outlive renders).
  const convRef = useRef(conv)
  const settingsRef = useRef(settings)
  const activeTurnRef = useRef<string | null>(conv.state.activeTurn)
  useEffect(() => {
    convRef.current = conv
    activeTurnRef.current = conv.state.activeTurn
  }, [conv])
  useEffect(() => {
    settingsRef.current = settings
    if (!playerRef.current?.isActive) inputRef.current?.setThreshold(settings.vad.positiveThreshold)
  }, [settings])

  const bargeIn = useCallback(() => {
    const s = seg.current
    if (s.bargedIn) return
    s.bargedIn = true
    const turn = activeTurnRef.current ?? playerRef.current?.currentTurn ?? null
    playerRef.current?.stop(turn)
    if (turn) convRef.current.cancel(turn)
  }, [])

  const teardown = useCallback(async () => {
    startToken.current++
    convRef.current.setAudioListener(null)
    const input = inputRef.current
    const ctx = ctxRef.current
    inputRef.current = null
    ctxRef.current = null
    playerRef.current?.stop()
    playerRef.current = null
    seg.current = { active: false, duringPlayback: false, speechMs: 0, bargedIn: false }
    setPlaying(false)
    setUserSpeaking(false)
    await input?.destroy()
    if (ctx && ctx.state !== 'closed') await ctx.close().catch(() => {})
  }, [])

  const start = useCallback(async () => {
    if (status !== 'off') return
    setError(null)
    setStatus('starting')
    const token = ++startToken.current
    let stream: MediaStream | null = null
    try {
      // Created inside the click handler so autoplay policy lets us play TTS.
      const ctx = new AudioContext()
      ctxRef.current = ctx
      await ctx.resume()
      stream = await openMic()
      if (token !== startToken.current) { stream.getTracks().forEach((t) => t.stop()); return }

      const player = new ChunkPlayer(ctx, {
        onPlayed: (turnId, s) => convRef.current.sendProgress(turnId, s),
        onActiveChange: (active) => {
          setPlaying(active)
          const base = settingsRef.current.vad.positiveThreshold
          inputRef.current?.setThreshold(active ? base + PLAYBACK_THRESHOLD_BOOST : base)
        },
      })
      playerRef.current = player

      const input = await VoiceInput.create(ctx, stream, settingsRef.current.vad, {
        onSpeechStart: () => {
          seg.current = { active: true, duringPlayback: player.isActive, speechMs: 0, bargedIn: false }
          setUserSpeaking(true)
        },
        onFrame: (prob, frameMs) => {
          const s = seg.current
          if (!s.active || s.bargedIn || !s.duringPlayback) return
          if (!player.isActive) { s.duringPlayback = false; return } // playback ended on its own
          const threshold = settingsRef.current.vad.positiveThreshold + PLAYBACK_THRESHOLD_BOOST
          if (prob >= threshold) s.speechMs += frameMs
          if (s.speechMs >= settingsRef.current.bargeInMinMs) bargeIn()
        },
        onMisfire: () => {
          seg.current.active = false
          setUserSpeaking(false)
        },
        onSpeechEnd: (audio) => {
          const s = seg.current
          s.active = false
          setUserSpeaking(false)
          // Speech that overlapped TTS without ever qualifying as barge-in is most likely echo.
          if (s.duringPlayback && !s.bargedIn) return
          const pending = activeTurnRef.current
          if (pending && !s.bargedIn) {
            // A new utterance supersedes a turn that is still being processed.
            playerRef.current?.stop(pending)
            convRef.current.cancel(pending)
          }
          const turnId = convRef.current.sendAudio(arrayBufferToBase64(encodeWavPcm16(audio, 16000)))
          activeTurnRef.current = turnId
        },
      })
      if (token !== startToken.current) { await input.destroy(); return }
      inputRef.current = input
      // Chunks of locally cancelled turns are dropped inside the player.
      conv.setAudioListener((chunk) => player.enqueue(chunk.turn_id, chunk.seq, chunk.data))
      conv.setVoice(true)
      setStatus('on')
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop())
      await teardown()
      setStatus('off')
      setError(err instanceof MicError ? err.message : `No se pudo iniciar el modo voz: ${err instanceof Error ? err.message : String(err)}. Verifique que los recursos de VAD estén en /vad (npm run assets:vad).`)
    }
  }, [status, conv, bargeIn, teardown])

  const stop = useCallback(async () => {
    if (status === 'off') return
    conv.setVoice(false)
    setStatus('off')
    await teardown()
  }, [status, conv, teardown])

  /** Manual interruption (button / Escape): silence playback and cancel the turn. */
  const interrupt = useCallback(() => {
    const turn = activeTurnRef.current ?? playerRef.current?.currentTurn ?? null
    playerRef.current?.stop(turn)
    if (turn) convRef.current.cancel(turn)
  }, [])

  // Release the mic when leaving the view.
  useEffect(() => () => { void teardown() }, [teardown])

  // Live mic level → transform/opacity on a single SVG node (no React re-render, no layout).
  const listening = status === 'on' && !playing
  useEffect(() => {
    const el = levelEl.current
    if (!listening || !el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let raf = 0
    let smooth = 0
    const tick = () => {
      const lvl = inputRef.current?.level() ?? 0
      smooth += (lvl - smooth) * (lvl > smooth ? 0.5 : 0.12) // fast attack, slow release
      el.style.opacity = String(0.12 + smooth * 0.88)
      if (!reduce) el.style.transform = `scale(${1 + smooth * 0.2})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.style.opacity = ''
      el.style.transform = ''
    }
  }, [listening])

  return { status, playing, userSpeaking, error, clearError: () => setError(null), start, stop, interrupt, levelEl }
}
