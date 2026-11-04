import { useEffect, useState } from 'react'

export type SlaLevel = 'ok' | 'warn' | 'late'

export function useNow(everyMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return now
}

function fmtSpan(ms: number): string {
  const mins = Math.max(1, Math.round(Math.abs(ms) / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h} h${mins % 60 ? ` ${mins % 60} min` : ''}`
  return `${Math.round(h / 24)} d`
}

/** Traffic light: green < 80 % of the window elapsed, amber ≥ 80 % (matches the backend `sla_warning`), red once due. */
export function slaInfo(dueIso: string | null | undefined, startIso: string | null | undefined, now: number): { level: SlaLevel; label: string } | null {
  if (!dueIso) return null
  const due = Date.parse(dueIso)
  if (Number.isNaN(due)) return null
  const start = Date.parse(startIso ?? '')
  const total = Math.max(due - (Number.isNaN(start) ? due - 24 * 3600000 : start), 1)
  const remaining = due - now
  if (remaining < 0) return { level: 'late', label: `Vencido hace ${fmtSpan(remaining)}` }
  const level: SlaLevel = (now - (due - total)) / total >= 0.8 ? 'warn' : 'ok'
  return { level, label: `Quedan ${fmtSpan(remaining)}` }
}
