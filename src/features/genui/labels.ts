import type { FlowKind, TopoKind } from './schema'

export const TOPO_KIND_LABEL: Record<TopoKind, string> = { isp: 'Proveedor', modem: 'Módem', router: 'Router', device: 'Dispositivo', pc: 'Computador' }
export const FLOW_KIND_LABEL: Record<FlowKind, string> = { question: 'Pregunta', answer: 'Respuesta', rule: 'Regla', hypothesis: 'Hipótesis', action: 'Acción' }
