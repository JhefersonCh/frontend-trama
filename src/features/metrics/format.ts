export const fmtMs = (v: number | null | undefined): string =>
  v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(v < 10000 ? 1 : 0)} s`
export const fmtInt = (v: number | null | undefined): string => (v == null ? '—' : v.toLocaleString('es-CO'))
export const fmtPct = (v: number | null | undefined): string => (v == null ? '—' : `${Math.round(v * 100)} %`)
const ACRO = new Set(['dns', 'dhcp', 'vlan', 'ip', 'tcp', 'udp'])
export function humanize(s: string | null): string {
  const t = (s ?? 'sin clasificar').replace(/_/g, ' ')
  return ACRO.has(t.toLowerCase()) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1)
}

/** Round a max up to 1/2/5 × 10^n so axis ticks read cleanly. */
export function niceMax(v: number): number {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
