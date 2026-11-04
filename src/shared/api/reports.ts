import { API_BASE, ApiError } from './client'

export type ReportKind = 'informe' | 'guia'

export const REPORT_LABEL: Record<ReportKind, string> = { informe: 'Informe del caso', guia: 'Guía paso a paso' }

const base = (sessionId: string) => `${API_BASE}/cases/${encodeURIComponent(sessionId)}`
export const reportHtmlUrl = (sessionId: string, kind: ReportKind = 'informe') => `${base(sessionId)}/report.html?kind=${kind}`
export const reportPdfUrl = (sessionId: string, kind: ReportKind = 'informe') => `${base(sessionId)}/report.pdf?kind=${kind}`

/**
 * Download the PDF version. The backend answers 501 when WeasyPrint is not in the image:
 * that surfaces as an ApiError with status 501 so the UI can point to the HTML version.
 */
export async function downloadReportPdf(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`
    try { const b = await res.json(); if (b?.detail) detail = b.detail } catch { /* not JSON */ }
    throw new ApiError(res.status, detail)
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
}
