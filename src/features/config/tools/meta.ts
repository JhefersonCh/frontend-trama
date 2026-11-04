import type { Tone } from '../../../shared/ui'
import type { ToolKind } from '../../../shared/api/tools'

export const KIND: Record<ToolKind, { label: string; tone: Tone; help: string }> = {
  builtin: { label: 'Integrada', tone: 'neutral', help: 'Viene con el sistema. Solo se edita la descripción y las intenciones.' },
  static_template: { label: 'Plantilla', tone: 'info', help: 'Responde con un texto fijo que puede incluir los parámetros.' },
  rag_search: { label: 'Búsqueda', tone: 'accent', help: 'Busca en la base de conocimiento con filtros fijos.' },
  sql_readonly: { label: 'Consulta', tone: 'success', help: 'Consulta de solo lectura sobre vistas autorizadas.' },
  http_request: { label: 'HTTP', tone: 'warning', help: 'Consulta un servicio externo permitido (con protección contra accesos internos).' },
  client_tool: { label: 'Navegador', tone: 'neutral', help: 'Se ejecuta en el navegador de la persona (fase 2).' },
}
export const CREATABLE_KINDS: ToolKind[] = ['static_template', 'rag_search', 'sql_readonly', 'http_request', 'client_tool']

export const INTENTS: { value: string; label: string }[] = [
  { value: 'smalltalk', label: 'Saludo' },
  { value: 'guide', label: 'Guía' },
  { value: 'diagnostic', label: 'Diagnóstico' },
  { value: 'clarify', label: 'Aclarar' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'output', label: 'Salida de comando' },
  { value: '*', label: 'Todas' },
]
export const intentLabel = (v: string) => INTENTS.find((i) => i.value === v)?.label ?? v

export const SQL_VIEWS: { name: string; columns: string; example: string }[] = [
  {
    name: 'v_tools_technicians_available',
    columns: 'name, specialties, zones, level, availability',
    example: 'select name, specialties, level from v_tools_technicians_available where %(zona)s = any(zones) order by name limit 20',
  },
  {
    name: 'v_tools_open_incidents_by_zone',
    columns: 'zone, category, count, latest',
    example: 'select zone, category, count, latest from v_tools_open_incidents_by_zone where zone = %(zona)s limit 20',
  },
]
