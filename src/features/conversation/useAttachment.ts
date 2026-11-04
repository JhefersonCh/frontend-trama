import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/api/client'
import { AUDIO_MAX_SECONDS, audioDuration, checkMediaFile, uploadMedia, type MediaKind, type MediaUpload } from '../../shared/api/media'

export type AttachmentStatus = 'uploading' | 'consent' | 'ready' | 'error'

export interface Attachment {
  file: File
  kind: MediaKind | null
  /** Local object URL for image previews. */
  preview: string | null
  status: AttachmentStatus
  progress: number
  upload: MediaUpload | null
  /** Error (status 'error') or a short note for the person. */
  message: string | null
}

/**
 * One pending attachment for the composer: client checks → upload with progress →
 * (image) consent gate for external vision → ready; (audio) transcript handed to the textarea.
 */
export function useAttachment(sessionId: string | null, onTranscript: (text: string) => void) {
  const [att, setAtt] = useState<Attachment | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const previewRef = useRef<string | null>(null)
  const transcriptRef = useRef(onTranscript)
  transcriptRef.current = onTranscript

  const revoke = () => {
    if (previewRef.current) { URL.revokeObjectURL(previewRef.current); previewRef.current = null }
  }
  useEffect(() => () => { ctrl.current?.abort(); revoke() }, [])

  const run = useCallback(async (file: File, kind: MediaKind, consent: boolean) => {
    if (!sessionId) {
      setAtt((a) => a && { ...a, status: 'error', message: 'Espere a que el chat se conecte para adjuntar archivos.' })
      return
    }
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setAtt((a) => a && { ...a, status: 'uploading', progress: 0, message: null })
    try {
      const up = await uploadMedia(file, sessionId, {
        consent, signal: c.signal,
        onProgress: (f) => setAtt((a) => a && a.file === file ? { ...a, progress: f } : a),
      })
      if (c.signal.aborted) return
      if (kind === 'image') {
        if (up.consent_required && !consent) { setAtt((a) => a && { ...a, status: 'consent', upload: up, progress: 1 }); return }
        setAtt((a) => a && {
          ...a, status: 'ready', upload: up, progress: 1,
          message: up.vision_available ? 'Lista para enviar: TRAMA revisará las luces del equipo.' : 'Se enviará sin análisis automático de la imagen.',
        })
      } else if (up.transcript) {
        transcriptRef.current(up.transcript)
        setAtt((a) => a && { ...a, status: 'ready', upload: up, progress: 1, message: 'Transcripción lista: revísela y envíela.' })
      } else {
        setAtt((a) => a && { ...a, status: 'error', upload: up, message: up.detail || 'No se pudo transcribir el audio: el servicio de voz no está disponible.' })
      }
    } catch (e) {
      if (c.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
      setAtt((a) => a && { ...a, status: 'error', message: errorMessage(e) })
    }
  }, [sessionId])

  const pick = useCallback(async (file: File) => {
    ctrl.current?.abort()
    revoke()
    const check = checkMediaFile(file)
    const base: Attachment = { file, kind: null, preview: null, status: 'error', progress: 0, upload: null, message: null }
    if ('error' in check) { setAtt({ ...base, message: check.error }); return }
    const preview = check.kind === 'image' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null
    previewRef.current = preview
    setAtt({ ...base, kind: check.kind, preview, status: 'uploading' })
    if (check.kind === 'audio') {
      const secs = await audioDuration(file)
      if (secs !== null && secs > AUDIO_MAX_SECONDS + 1) {
        setAtt((a) => a && { ...a, status: 'error', message: `El audio dura ${Math.round(secs / 60 * 10) / 10} min; el máximo es 3 min.` })
        return
      }
    }
    void run(file, check.kind, false)
  }, [run])

  const acceptConsent = useCallback(() => { if (att?.kind === 'image') void run(att.file, 'image', true) }, [att, run])

  /** Drop the attachment. `keepPreview` hands the object URL over to a sent message bubble. */
  const clear = useCallback((keepPreview = false) => {
    ctrl.current?.abort()
    ctrl.current = null
    if (keepPreview) previewRef.current = null
    else revoke()
    setAtt(null)
  }, [])

  return { att, pick, clear, acceptConsent }
}
