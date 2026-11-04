import { useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/client'
import { downloadReportPdf, reportHtmlUrl, reportPdfUrl, REPORT_LABEL, type ReportKind } from '../../shared/api/reports'
import { GlyphDownload, GlyphExternal } from './icons'

/** "Abrir" (HTML, new tab) + "PDF" for one report kind. A 501 from the backend means only HTML exists. */
export function ReportButtons({ htmlUrl, pdfUrl, kind, filename, onOpen, compact = false }: {
  htmlUrl: string; pdfUrl: string | null; kind: ReportKind; filename: string; onOpen?: () => void; compact?: boolean
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const pdf = async () => {
    if (!pdfUrl || state === 'loading') return
    setState('loading')
    setErr(null)
    try {
      await downloadReportPdf(pdfUrl, filename)
      setState('idle')
      onOpen?.()
    } catch (e) {
      if (e instanceof ApiError && e.status === 501) setState('unavailable')
      else { setState('error'); setErr(errorMessage(e)) }
    }
  }

  return (
    <div className="rp-btns">
      <a className={`btn ${compact ? 'btn-secondary' : 'btn-primary'} btn-sm`} href={htmlUrl} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
        <GlyphExternal size={14} />{compact ? REPORT_LABEL[kind] : 'Abrir'}
      </a>
      {pdfUrl && state !== 'unavailable' && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void pdf()} disabled={state === 'loading'} aria-label={`Descargar ${REPORT_LABEL[kind].toLowerCase()} en PDF`}>
          <GlyphDownload size={14} />{state === 'loading' ? 'Preparando…' : 'PDF'}
        </button>
      )}
      {state === 'unavailable' && <span className="rp-note" role="status">PDF no disponible: use la versión web e imprima → Guardar como PDF.</span>}
      {state === 'error' && <span className="rp-note is-err" role="alert">{err}</span>}
    </div>
  )
}

/** Report access for a case (Diagnóstico): informe + guía, HTML always, PDF when the backend can render it. */
export function CaseReports({ sessionId }: { sessionId: string }) {
  return (
    <div className="rp-case" role="group" aria-label="Informes del caso">
      {(['informe', 'guia'] as const).map((k) => (
        <ReportButtons
          key={k} kind={k} compact
          htmlUrl={reportHtmlUrl(sessionId, k)} pdfUrl={reportPdfUrl(sessionId, k)}
          filename={`trama-${k}-${sessionId.slice(0, 8)}.pdf`}
        />
      ))}
    </div>
  )
}
