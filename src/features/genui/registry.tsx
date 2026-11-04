import type { ComponentType } from 'react'
import { AssignmentForm } from './AssignmentForm'
import { CaseCard } from './CaseCard'
import { Checklist } from './Checklist'
import { CompareCards } from './CompareCards'
import { Gauge } from './Gauge'
import { HypothesisBars } from './HypothesisBars'
import { ImageAnnotated } from './ImageAnnotated'
import { DiagnosisFlow, Topology } from './Network'
import { QuickReplies } from './QuickReplies'
import { ReportCard } from './ReportCard'
import * as S from './schema'
import { Timeline } from './Timeline'
import type { GenUiComponentProps } from './types'

export interface GenUiDef<P = unknown> {
  parse: (props: unknown) => P | null
  Component: ComponentType<GenUiComponentProps<P>>
  /** Answered once, then collapses into a compact "respondido" row. */
  oneShot: boolean
  /** Eyebrow of the collapsed row. */
  title: string
}

const def = <P,>(d: GenUiDef<P>) => d as unknown as GenUiDef

/** Closed catalog (contract §2). Unknown names render `fallback_text`. */
export const REGISTRY: Record<string, GenUiDef> = {
  quick_replies: def({ parse: S.quickReplies, Component: QuickReplies, oneShot: true, title: 'Respuesta' }),
  checklist: def({ parse: S.checklist, Component: Checklist, oneShot: false, title: 'Pasos guiados' }),
  form: def({ parse: S.form, Component: AssignmentForm, oneShot: true, title: 'Formulario' }),
  case_card: def({ parse: S.caseCard, Component: CaseCard, oneShot: false, title: 'Estado del caso' }),
  hypothesis_bars: def({ parse: S.hypothesisBars, Component: HypothesisBars, oneShot: false, title: 'Hipótesis' }),
  timeline: def({ parse: S.timeline, Component: Timeline, oneShot: false, title: 'Línea de tiempo' }),
  topology: def({ parse: S.topology, Component: Topology, oneShot: false, title: 'Red de la casa' }),
  diagnosis_flow: def({ parse: S.diagnosisFlow, Component: DiagnosisFlow, oneShot: false, title: 'Camino del diagnóstico' }),
  compare_cards: def({ parse: S.compareCards, Component: CompareCards, oneShot: true, title: 'Opción elegida' }),
  gauge: def({ parse: S.gauge, Component: Gauge, oneShot: false, title: 'Medición' }),
  image_annotated: def({ parse: S.imageAnnotated, Component: ImageAnnotated, oneShot: true, title: 'Foto analizada' }),
  report_card: def({ parse: S.reportCard, Component: ReportCard, oneShot: false, title: 'Informe' }),
}

/** Names whose open instances close when the person answers by typing or speaking instead. */
export const CLOSE_ON_USER_TURN = new Set(['quick_replies', 'compare_cards', 'image_annotated'])
export const isOneShot = (component: string) => !!REGISTRY[component]?.oneShot
