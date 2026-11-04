import type { Model } from 'vosk-browser'
import { openMic } from './voiceInput'

/** Installed by `npm run fetch:vosk` (scripts/fetch-vosk-model.mjs); not committed. */
export const VOSK_MODEL_URL = `${import.meta.env.BASE_URL}vosk/vosk-model-small-es-0.42.tar.gz`

/** The SPA fallback answers unknown paths with index.html, so a 200 alone is not proof. */
export async function voskModelInstalled(): Promise<boolean> {
  try {
    const res = await fetch(VOSK_MODEL_URL, { method: 'HEAD', cache: 'no-store' })
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')
  } catch {
    return false
  }
}

let modelPromise: Promise<Model> | null = null
function loadModel(): Promise<Model> {
  if (!modelPromise) {
    modelPromise = import('vosk-browser')
      .then(({ createModel }) => createModel(VOSK_MODEL_URL, -1))
      .catch((err) => { modelPromise = null; throw err })
  }
  return modelPromise
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Passive keyword spotting with Vosk restricted to a tiny grammar
 * ([phrase, "[unk]"]), so it only ever "hears" the wake phrase or noise.
 */
export class WakeWordListener {
  private stopped = false
  private readonly teardown: () => void

  private constructor(teardown: () => void) {
    this.teardown = teardown
  }

  static async start(phrase: string, onDetect: () => void): Promise<WakeWordListener> {
    const target = normalize(phrase)
    if (!target) throw new Error('La frase de activación está vacía.')
    const model = await loadModel()
    const stream = await openMic()
    const ctx = new AudioContext()
    const recognizer = new model.KaldiRecognizer(ctx.sampleRate, JSON.stringify([phrase.toLowerCase(), '[unk]']))
    const source = ctx.createMediaStreamSource(stream)
    // ScriptProcessor is deprecated but it is what vosk-browser consumes (AudioBuffer per block).
    const node = ctx.createScriptProcessor(4096, 1, 1)
    let listener: WakeWordListener | null = null
    const check = (text: string | undefined) => {
      if (!listener || listener.stopped || !text) return
      if (normalize(text).includes(target)) onDetect()
    }
    recognizer.on('result', (m) => check((m as { result?: { text?: string } }).result?.text))
    recognizer.on('partialresult', (m) => check((m as { result?: { partial?: string } }).result?.partial))
    node.onaudioprocess = (ev) => {
      try { recognizer.acceptWaveform(ev.inputBuffer) } catch { /* recognizer busy */ }
    }
    source.connect(node)
    node.connect(ctx.destination)
    listener = new WakeWordListener(() => {
      node.onaudioprocess = null
      try { source.disconnect(); node.disconnect() } catch { /* already */ }
      try { recognizer.remove() } catch { /* already */ }
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close()
    })
    return listener
  }

  stop() {
    if (this.stopped) return
    this.stopped = true
    this.teardown()
  }
}
