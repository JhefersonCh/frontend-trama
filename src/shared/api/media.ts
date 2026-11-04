import { API_BASE, ApiError, formatDetail, type ErrorDetail } from './client'

/** Contract §3 — POST /api/media. */
export interface LedReading {
  label: string
  color: 'verde' | 'roja' | 'naranja' | 'apagada' | (string & {})
  blink: boolean
  bbox: [number, number, number, number]
}
export interface MediaAnalysis {
  device: string
  leds: LedReading[]
  error_text: string | null
  confidence: number
}
export interface MediaUpload {
  media_id: string
  kind: 'image' | 'audio'
  url: string
  mime: string
  transcript: string | null
  analysis: MediaAnalysis | null
  vision_available: boolean
  consent_required: boolean
  /** Present when the transcript could not be produced (voice service down). */
  detail?: string | null
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'] as const
const AUDIO_EXT = /\.(webm|ogg|oga|mp3|wav|m4a)$/i
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024
export const AUDIO_MAX_SECONDS = 180
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,.m4a,.mp3,.wav,.ogg,.webm'

export type MediaKind = 'image' | 'audio'

/** Client-side guard mirroring the backend limits. Returns the kind or a user-facing error. */
export function checkMediaFile(file: File): { kind: MediaKind } | { error: string } {
  const type = file.type.toLowerCase()
  const isImage = (IMAGE_TYPES as readonly string[]).includes(type) || (!type && IMAGE_EXT.test(file.name))
  const isAudio = (AUDIO_TYPES as readonly string[]).includes(type) || ((!type || type === 'video/webm' || type === 'video/mp4') && AUDIO_EXT.test(file.name))
  if (isImage) {
    if (file.size > IMAGE_MAX_BYTES) return { error: `La imagen pesa ${fmtBytes(file.size)}; el máximo es 8 MB.` }
    return { kind: 'image' }
  }
  if (isAudio) {
    if (file.size > AUDIO_MAX_BYTES) return { error: `El audio pesa ${fmtBytes(file.size)}; el máximo es 10 MB.` }
    return { kind: 'audio' }
  }
  return { error: 'Formato no admitido. Use una foto JPG, PNG o WebP, o un audio WebM, OGG, MP3, WAV o M4A.' }
}

/** Best-effort duration check (3 min). Resolves null when the browser cannot read the file. */
export function audioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof URL.createObjectURL !== 'function' || typeof Audio === 'undefined') { resolve(null); return }
    const url = URL.createObjectURL(file)
    const a = new Audio()
    const done = (v: number | null) => { URL.revokeObjectURL(url); resolve(v) }
    const t = window.setTimeout(() => done(null), 4000)
    a.preload = 'metadata'
    a.onloadedmetadata = () => { window.clearTimeout(t); done(Number.isFinite(a.duration) ? a.duration : null) }
    a.onerror = () => { window.clearTimeout(t); done(null) }
    a.src = url
  })
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** URL that serves a stored file: the backend checks the owning session in the query. */
export function mediaUrl(url: string, sessionId: string | null): string {
  if (!sessionId) return url
  return `${url}${url.includes('?') ? '&' : '?'}session_id=${encodeURIComponent(sessionId)}`
}

/**
 * Multipart upload with progress (XHR: fetch has no upload progress).
 * `consent` is sent after the person accepted that an external vision service sees the image.
 */
export function uploadMedia(
  file: File, sessionId: string,
  { consent = false, onProgress, signal }: { consent?: boolean; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<MediaUpload> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('session_id', sessionId)
    if (consent) form.append('consent', 'true')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/media${consent ? '?consent=true' : ''}`)
    xhr.responseType = 'text'
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total) }
    xhr.onload = () => {
      let body: unknown = null
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body && typeof body === 'object') { resolve(body as MediaUpload); return }
      const detail = (body as { detail?: ErrorDetail } | null)?.detail ?? (xhr.statusText || `HTTP ${xhr.status}`)
      reject(new ApiError(xhr.status, detail))
    }
    xhr.onerror = () => reject(new ApiError(0, 'No se pudo subir el archivo. Revise la conexión.'))
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    if (signal) {
      if (signal.aborted) { reject(new DOMException('Subida cancelada', 'AbortError')); return }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(form)
  })
}

export { formatDetail }
