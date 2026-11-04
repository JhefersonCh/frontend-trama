import { base64ToArrayBuffer } from './wav'

export interface PlayerCallbacks {
  /** A chunk finished playing (send playback_progress). */
  onPlayed: (turnId: string, seq: number) => void
  /** true while any audio is queued or playing. */
  onActiveChange: (active: boolean) => void
}

/**
 * Gapless, seq-ordered playback of TTS chunks with the Web Audio API.
 * Chunks are decoded as they arrive and scheduled back-to-back; a chunk only
 * plays once every lower seq of the same turn has been scheduled.
 */
export class ChunkPlayer {
  private readonly ctx: AudioContext
  private readonly cb: PlayerCallbacks
  private turnId: string | null = null
  private nextSeq: number | null = null
  private decoded = new Map<number, AudioBuffer>()
  private sources = new Set<AudioBufferSourceNode>()
  private pendingDecodes = 0
  private playhead = 0
  private generation = 0
  private active = false
  /** Turns that were cancelled locally: late chunks for them are dropped. */
  private dropped = new Set<string>()

  constructor(ctx: AudioContext, cb: PlayerCallbacks) {
    this.ctx = ctx
    this.cb = cb
  }

  get currentTurn(): string | null {
    return this.turnId
  }

  get isActive() {
    return this.active
  }

  enqueue(turnId: string, seq: number, b64: string) {
    if (this.dropped.has(turnId)) return
    if (this.turnId !== turnId) {
      // A new turn supersedes whatever was still playing.
      this.hardStop()
      this.turnId = turnId
      this.nextSeq = seq // WebSocket preserves order, so the first chunk carries the lowest seq.
    }
    const gen = this.generation
    this.pendingDecodes++
    this.setActive(true)
    void this.ctx
      .decodeAudioData(base64ToArrayBuffer(b64))
      .then((buf) => {
        if (gen !== this.generation) return
        this.decoded.set(seq, buf)
        this.pump()
      })
      .catch(() => {
        // Undecodable chunk: skip it so later ones still play.
        if (gen !== this.generation) return
        if (this.nextSeq === seq) this.nextSeq = seq + 1
        this.pump()
      })
      .finally(() => {
        if (gen !== this.generation) return
        this.pendingDecodes--
        this.settle()
      })
  }

  private pump() {
    while (this.nextSeq !== null && this.decoded.has(this.nextSeq)) {
      const seq = this.nextSeq
      const buf = this.decoded.get(seq)!
      this.decoded.delete(seq)
      this.nextSeq = seq + 1
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.connect(this.ctx.destination)
      const startAt = Math.max(this.ctx.currentTime + 0.02, this.playhead)
      this.playhead = startAt + buf.duration
      const turn = this.turnId!
      const gen = this.generation
      src.onended = () => {
        this.sources.delete(src)
        if (gen !== this.generation) return
        this.cb.onPlayed(turn, seq)
        this.settle()
      }
      this.sources.add(src)
      src.start(startAt)
    }
  }

  private settle() {
    if (this.sources.size === 0 && this.pendingDecodes === 0 && this.decoded.size === 0) this.setActive(false)
  }

  private setActive(v: boolean) {
    if (this.active === v) return
    this.active = v
    this.cb.onActiveChange(v)
  }

  private hardStop() {
    this.generation++
    for (const s of this.sources) {
      s.onended = null
      try { s.stop() } catch { /* not started */ }
      s.disconnect()
    }
    this.sources.clear()
    this.decoded.clear()
    this.pendingDecodes = 0
    this.playhead = 0
    this.nextSeq = null
    this.turnId = null
  }

  /** Barge-in / cancel: silence immediately and ignore the rest of this turn. */
  stop(turnId?: string | null) {
    if (turnId) this.dropped.add(turnId)
    if (this.turnId) this.dropped.add(this.turnId)
    this.hardStop()
    this.setActive(false)
  }
}
