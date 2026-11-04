import type { MicVAD } from '@ricky0123/vad-web'

/** VAD + ONNX Runtime assets are copied to public/vad by scripts/copy-vad-assets.mjs (no CDN). */
export const VAD_ASSET_PATH = `${import.meta.env.BASE_URL}vad/`

export interface VadSettings {
  positiveThreshold: number
  minSilenceMs: number
}

export interface VoiceInputCallbacks {
  onSpeechStart: () => void
  /** 16 kHz mono Float32 samples of the finished utterance. */
  onSpeechEnd: (audio: Float32Array) => void
  onMisfire: () => void
  /** Called once per VAD frame with the speech probability. */
  onFrame: (speechProb: number, frameMs: number) => void
}

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
}

export class MicError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MicError'
  }
}

/** Opens the microphone with echo cancellation; throws MicError with a user-facing Spanish message. */
export async function openMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError('Este navegador solo permite usar el micrófono en https:// o en localhost. Abra TRAMA desde una de esas direcciones.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new MicError('Permiso de micrófono denegado. Habilítelo desde el ícono junto a la dirección del sitio y vuelva a intentarlo.')
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new MicError('No se encontró ningún micrófono. Conecte uno y vuelva a intentarlo.')
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      throw new MicError('El micrófono está en uso por otra aplicación o no responde.')
    }
    throw new MicError(`No se pudo abrir el micrófono${err instanceof Error ? `: ${err.message}` : '.'}`)
  }
}

const FRAME_MS = 32 // Silero v5: 512 samples @ 16 kHz

/**
 * Mic → Silero VAD (in an AudioWorklet) + an AnalyserNode for the level meter.
 * The VAD keeps running while TTS plays so the caller can implement barge-in.
 */
export class VoiceInput {
  private readonly vad: MicVAD
  private readonly analyser: AnalyserNode
  private readonly source: MediaStreamAudioSourceNode
  private readonly stream: MediaStream
  private readonly buf: Float32Array<ArrayBuffer>

  private constructor(vad: MicVAD, analyser: AnalyserNode, source: MediaStreamAudioSourceNode, stream: MediaStream) {
    this.vad = vad
    this.analyser = analyser
    this.source = source
    this.stream = stream
    this.buf = new Float32Array(analyser.fftSize)
  }

  static async create(ctx: AudioContext, stream: MediaStream, settings: VadSettings, cb: VoiceInputCallbacks): Promise<VoiceInput> {
    const { MicVAD } = await import('@ricky0123/vad-web')
    const positive = clamp(settings.positiveThreshold, 0.05, 0.98)
    const vad = await MicVAD.new({
      model: 'v5',
      baseAssetPath: VAD_ASSET_PATH,
      onnxWASMBasePath: VAD_ASSET_PATH,
      audioContext: ctx,
      startOnLoad: false,
      getStream: async () => stream,
      pauseStream: async () => {},
      resumeStream: async () => stream,
      positiveSpeechThreshold: positive,
      negativeSpeechThreshold: Math.max(0.01, positive - 0.15),
      redemptionMs: Math.max(100, settings.minSilenceMs),
      preSpeechPadMs: 300,
      minSpeechMs: 250,
      submitUserSpeechOnPause: false,
      ortConfig: (ort) => {
        ort.env.logLevel = 'error'
        ort.env.wasm.numThreads = 1 // no cross-origin isolation → no SharedArrayBuffer
      },
      onSpeechStart: cb.onSpeechStart,
      onSpeechEnd: cb.onSpeechEnd,
      onVADMisfire: cb.onMisfire,
      onSpeechRealStart: () => {},
      onFrameProcessed: (probs) => cb.onFrame(probs.isSpeech, FRAME_MS),
    })
    await vad.start()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    return new VoiceInput(vad, analyser, source, stream)
  }

  /** Raise the threshold while TTS plays to resist residual echo; restore after. */
  setThreshold(positive: number) {
    const p = clamp(positive, 0.05, 0.98)
    this.vad.setOptions({ positiveSpeechThreshold: p, negativeSpeechThreshold: Math.max(0.01, p - 0.15) })
  }

  /** RMS level of the mic, roughly 0..1. */
  level(): number {
    this.analyser.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i]
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 4)
  }

  async destroy() {
    try { this.source.disconnect() } catch { /* already */ }
    try { await this.vad.destroy() } catch { /* already */ }
    this.stream.getTracks().forEach((t) => t.stop())
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo))
}
