/**
 * Prop contracts of the generative-UI catalog (TRAMA_contracts_ui_media.md §2) and
 * hand-written guards. A guard returns the typed props or null; null renders `fallback_text`.
 * Guards are strict on what the component needs and tolerant on optional extras.
 */

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): v is string => typeof v === 'string'
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const optStr = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): v is T => typeof v === 'string' && (opts as readonly string[]).includes(v)

/** Map every item through `f`; any null fails the whole list. */
function list<T>(v: unknown, f: (x: unknown) => T | null, { min = 0 } = {}): T[] | null {
  if (!Array.isArray(v) || v.length < min) return null
  const out: T[] = []
  for (const x of v) {
    const r = f(x)
    if (r === null) return null
    out.push(r)
  }
  return out
}

// ---------- quick_replies ----------
export interface Option { label: string; value: string }
const option = (x: unknown): Option | null =>
  isObj(x) && str(x.label) && (str(x.value) || typeof x.value === 'number' || typeof x.value === 'boolean')
    ? { label: x.label, value: String(x.value) }
    : null
export interface QuickRepliesProps { fact: string; question: string; options: Option[]; allow_free_text: boolean }
export function quickReplies(p: unknown): QuickRepliesProps | null {
  if (!isObj(p) || !str(p.fact)) return null
  const options = list(p.options, option, { min: 1 })
  if (!options) return null
  return { fact: p.fact, question: str(p.question) ? p.question : '', options, allow_free_text: p.allow_free_text === true }
}

// ---------- checklist ----------
export type StepStatus = 'pending' | 'done' | 'failed'
export interface Step { id: string; text: string; status: StepStatus }
export interface ChecklistProps { action_id: string; title: string; steps: Step[]; current: string | null }
export function checklist(p: unknown): ChecklistProps | null {
  if (!isObj(p) || !str(p.action_id)) return null
  const steps = list(p.steps, (x) =>
    isObj(x) && (str(x.id) || num(x.id)) && str(x.text) && oneOf(x.status ?? 'pending', ['pending', 'done', 'failed'] as const)
      ? { id: String(x.id), text: x.text, status: (x.status ?? 'pending') as StepStatus }
      : null, { min: 1 })
  if (!steps) return null
  const current = str(p.current) || num(p.current) ? String(p.current) : null
  return { action_id: p.action_id, title: str(p.title) ? p.title : 'Pasos', steps, current }
}

// ---------- form ----------
export interface FormField { name: string; label: string; type: 'select' | 'text' | 'consent_text'; options?: Option[]; placeholder?: string; value?: string }
export interface FormProps { form_id: string; title: string; fields: FormField[]; submit_label: string }
export function form(p: unknown): FormProps | null {
  if (!isObj(p) || !str(p.form_id)) return null
  const fields = list(p.fields, (x) => {
    if (!isObj(x) || !str(x.name) || !oneOf(x.type, ['select', 'text', 'consent_text'] as const)) return null
    const options = x.type === 'select' ? list(x.options, option, { min: 1 }) : undefined
    if (options === null) return null
    return {
      name: x.name, label: str(x.label) ? x.label : x.name, type: x.type,
      ...(options ? { options } : {}),
      ...(str(x.placeholder) ? { placeholder: x.placeholder } : {}),
      ...(x.value != null && x.value !== '' ? { value: String(x.value) } : {}),
    } satisfies FormField
  }, { min: 1 })
  if (!fields) return null
  return { form_id: p.form_id, title: str(p.title) ? p.title : 'Formulario', fields, submit_label: str(p.submit_label) ? p.submit_label : 'Enviar' }
}

// ---------- case_card ----------
export interface TopHyp { key: string; label: string; cf: number; confidence_label: string }
export interface CaseTicket { number: string; status: string; status_label: string; technician: string | null; sla_due_at: string | null }
export interface CaseCardProps { state: string; state_label: string; top_hypothesis: TopHyp | null; next_step: string | null; ticket: CaseTicket | null }
const topHyp = (x: unknown): TopHyp | null =>
  isObj(x) && str(x.key) && num(x.cf)
    ? { key: x.key, label: str(x.label) ? x.label : x.key, cf: x.cf, confidence_label: str(x.confidence_label) ? x.confidence_label : confidenceLabel(x.cf) }
    : null
export function caseCard(p: unknown): CaseCardProps | null {
  if (!isObj(p) || !str(p.state)) return null
  const hyp = p.top_hypothesis == null ? null : topHyp(p.top_hypothesis)
  if (p.top_hypothesis != null && !hyp) return null
  let ticket: CaseTicket | null = null
  if (p.ticket != null) {
    const t = p.ticket
    if (!isObj(t) || !str(t.number)) return null
    ticket = {
      number: t.number, status: str(t.status) ? t.status : '', status_label: str(t.status_label) ? t.status_label : str(t.status) ? t.status : '',
      technician: optStr(t.technician), sla_due_at: optStr(t.sla_due_at),
    }
  }
  return { state: p.state, state_label: str(p.state_label) ? p.state_label : p.state, top_hypothesis: hyp, next_step: optStr(p.next_step), ticket }
}

// ---------- hypothesis_bars ----------
export interface HypItem { key: string; label: string; cf: number; status: string; confidence_label: string }
export interface HypothesisBarsProps { items: HypItem[]; thresholds: { accept: number; reject: number } }
export function hypothesisBars(p: unknown): HypothesisBarsProps | null {
  if (!isObj(p)) return null
  const items = list(p.items, (x) =>
    isObj(x) && str(x.key) && num(x.cf)
      ? { key: x.key, label: str(x.label) ? x.label : x.key, cf: x.cf, status: str(x.status) ? x.status : 'viva', confidence_label: str(x.confidence_label) ? x.confidence_label : confidenceLabel(x.cf) }
      : null, { min: 1 })
  if (!items) return null
  const th = isObj(p.thresholds) ? p.thresholds : {}
  return { items, thresholds: { accept: num(th.accept) ? th.accept : 0.8, reject: num(th.reject) ? th.reject : -0.5 } }
}

// ---------- timeline ----------
export const TIMELINE_KINDS = ['fact', 'step', 'ticket', 'note', 'followup', 'system'] as const
export type TimelineKind = (typeof TIMELINE_KINDS)[number]
export interface TimelineItem { at: string; kind: TimelineKind; title: string; detail: string | null }
export function timeline(p: unknown): { items: TimelineItem[] } | null {
  if (!isObj(p)) return null
  const items = list(p.items, (x) =>
    isObj(x) && str(x.title)
      ? { at: str(x.at) ? x.at : '', kind: oneOf(x.kind, TIMELINE_KINDS) ? x.kind : 'system', title: x.title, detail: optStr(x.detail) }
      : null, { min: 1 })
  return items ? { items } : null
}

// ---------- topology ----------
export const TOPO_KINDS = ['isp', 'modem', 'router', 'device', 'pc'] as const
export type TopoKind = (typeof TOPO_KINDS)[number]
export type NodeStatus = 'ok' | 'fail' | 'warn' | 'unknown'
export interface TopoNode { id: string; kind: TopoKind; label: string; status: NodeStatus; detail: string | null }
export interface TopoEdge { from: string; to: string; status: 'ok' | 'fail' | 'unknown' }
export interface TopologyProps { nodes: TopoNode[]; edges: TopoEdge[] }
export function topology(p: unknown): TopologyProps | null {
  if (!isObj(p)) return null
  const nodes = list(p.nodes, (x) =>
    isObj(x) && str(x.id) && oneOf(x.kind, TOPO_KINDS)
      ? { id: x.id, kind: x.kind, label: str(x.label) ? x.label : x.id, status: oneOf(x.status, ['ok', 'fail', 'warn', 'unknown'] as const) ? x.status : 'unknown', detail: optStr(x.detail) }
      : null, { min: 1 })
  if (!nodes) return null
  const ids = new Set(nodes.map((n) => n.id))
  const edges = list(p.edges ?? [], (x) =>
    isObj(x) && str(x.from) && str(x.to)
      ? { from: x.from, to: x.to, status: oneOf(x.status, ['ok', 'fail', 'unknown'] as const) ? x.status : 'unknown' }
      : null)
  if (!edges) return null
  return { nodes, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)) }
}

// ---------- diagnosis_flow ----------
export const FLOW_KINDS = ['question', 'answer', 'rule', 'hypothesis', 'action'] as const
export type FlowKind = (typeof FLOW_KINDS)[number]
export interface FlowNode { id: string; kind: FlowKind; label: string; detail: string | null }
export interface FlowEdge { from: string; to: string; label: string | null }
export interface DiagnosisFlowProps { nodes: FlowNode[]; edges: FlowEdge[] }
export function diagnosisFlow(p: unknown): DiagnosisFlowProps | null {
  if (!isObj(p)) return null
  const nodes = list(p.nodes, (x) =>
    isObj(x) && str(x.id) && oneOf(x.kind, FLOW_KINDS) ? { id: x.id, kind: x.kind, label: str(x.label) ? x.label : x.id, detail: optStr(x.detail) } : null, { min: 1 })
  if (!nodes) return null
  const ids = new Set(nodes.map((n) => n.id))
  const edges = list(p.edges ?? [], (x) => (isObj(x) && str(x.from) && str(x.to) ? { from: x.from, to: x.to, label: optStr(x.label) } : null))
  if (!edges) return null
  return { nodes, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)) }
}

// ---------- compare_cards ----------
export interface CompareOption { id: string; title: string; summary: string; pros: string[]; cons: string[] }
export interface CompareProps { question: string; options: CompareOption[] }
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter(str) : [])
export function compareCards(p: unknown): CompareProps | null {
  if (!isObj(p)) return null
  const options = list(p.options, (x) =>
    isObj(x) && str(x.id) && str(x.title) ? { id: x.id, title: x.title, summary: str(x.summary) ? x.summary : '', pros: strs(x.pros), cons: strs(x.cons) } : null, { min: 2 })
  return options ? { question: str(p.question) ? p.question : '', options } : null
}

// ---------- gauge ----------
export type BandTone = 'bad' | 'warn' | 'good'
export interface GaugeProps { label: string; value: number; unit: string; max: number; bands: { to: number; tone: BandTone }[] }
export function gauge(p: unknown): GaugeProps | null {
  if (!isObj(p) || !num(p.value) || !num(p.max) || p.max <= 0) return null
  const bands = list(p.bands ?? [], (x) => (isObj(x) && num(x.to) && oneOf(x.tone, ['bad', 'warn', 'good'] as const) ? { to: x.to, tone: x.tone } : null))
  if (!bands) return null
  return { label: str(p.label) ? p.label : 'Medición', value: p.value, unit: str(p.unit) ? p.unit : '', max: p.max, bands: [...bands].sort((a, b) => a.to - b.to) }
}

// ---------- image_annotated ----------
export const LED_COLORS = ['roja', 'verde', 'naranja', 'apagada', 'desconocido'] as const
export type LedColor = (typeof LED_COLORS)[number]
export interface Box { bbox: [number, number, number, number]; label: string; color: LedColor }
export interface ImageAnnotatedProps {
  media_id: string; url: string; width: number; height: number; boxes: Box[]
  question: string | null; confirm_fact: { key: string; value: string } | null
}
export function imageAnnotated(p: unknown): ImageAnnotatedProps | null {
  if (!isObj(p) || !str(p.media_id) || !str(p.url)) return null
  const boxes = list(p.boxes ?? [], (x) => {
    if (!isObj(x) || !Array.isArray(x.bbox) || x.bbox.length !== 4 || !x.bbox.every(num)) return null
    const [bx, by, bw, bh] = (x.bbox as number[]).map((v) => Math.max(0, Math.min(1, v)))
    return { bbox: [bx, by, bw, bh] as [number, number, number, number], label: str(x.label) ? x.label : '', color: oneOf(x.color, LED_COLORS) ? x.color : 'desconocido' }
  })
  if (!boxes) return null
  const cf = isObj(p.confirm_fact) && str(p.confirm_fact.key) ? { key: p.confirm_fact.key, value: String(p.confirm_fact.value ?? '') } : null
  return {
    media_id: p.media_id, url: p.url, width: num(p.width) && p.width > 0 ? p.width : 4, height: num(p.height) && p.height > 0 ? p.height : 3,
    boxes, question: optStr(p.question), confirm_fact: cf,
  }
}

// ---------- report_card ----------
export interface ReportCardProps { title: string; html_url: string; pdf_url: string | null; kind: 'informe' | 'guia' }
export function reportCard(p: unknown): ReportCardProps | null {
  if (!isObj(p) || !str(p.html_url)) return null
  const kind = p.kind === 'guia' ? 'guia' : 'informe'
  return { title: str(p.title) ? p.title : kind === 'guia' ? 'Guía paso a paso' : 'Informe del caso', html_url: p.html_url, pdf_url: optStr(p.pdf_url), kind }
}

/** Contract wording for a certainty factor. */
export function confidenceLabel(cf: number): string {
  if (cf >= 0.8) return 'muy probable'
  if (cf >= 0.5) return 'probable'
  if (cf >= 0.2) return 'posible'
  return 'poco probable'
}
