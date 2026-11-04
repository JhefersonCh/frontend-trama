import { Banner, Field, Input, Select, Textarea } from '../../../shared/ui'
import { useProviders } from '../providers/useProviders'
import type { JsonSchema, ToolKind } from '../../../shared/api/tools'
import { SQL_VIEWS } from './meta'

type Cfg = Record<string, unknown>
interface P { config: Cfg; onChange: (c: Cfg) => void; schema: JsonSchema }

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)

const DOC_TYPES = [
  'manual', 'guia', 'procedimiento', 'rfc', 'faq', 'politica', 'otro',
  'troubleshooting_guide', 'os_guide', 'standard', 'security_guideline',
].map((v) => ({ value: v, label: v }))

function StaticTemplate({ config, onChange, schema }: P) {
  const vars = Object.keys(schema.properties ?? {})
  const text = str(config.template)
  return (
    <>
      <Field label="Texto de la respuesta" htmlFor="tl-template"
        hint="El texto se envía tal cual al modelo. Use {{ nombre }} para insertar un parámetro.">
        <Textarea id="tl-template" rows={5} value={text} onChange={(e) => onChange({ ...config, template: e.target.value })}
          placeholder="Nuestro horario es {{ dia }} de 8 a 17" />
      </Field>
      <div className="tl-vars">
        <span className="muted">Variables disponibles:</span>
        {vars.length === 0 && <span className="muted"> ninguna (agregue parámetros abajo)</span>}
        {vars.map((v) => (
          <button type="button" key={v} className="tag tl-var" onClick={() => onChange({ ...config, template: `${text}{{ ${v} }}` })}>{`{{ ${v} }}`}</button>
        ))}
      </div>
    </>
  )
}

function RagSearch({ config, onChange }: P) {
  const filters = (config.filters ?? {}) as Record<string, unknown>
  const set = (k: string, v: unknown) => {
    const f = { ...filters }
    if (v === '' || v === undefined) delete f[k]; else f[k] = v
    onChange({ ...config, filters: f })
  }
  const synth = filters.is_synthetic === undefined ? '' : String(filters.is_synthetic)
  return (
    <>
      <p className="hint tl-note">La herramienta recibe el parámetro <code>query</code> y busca solo con estos filtros fijos.</p>
      <div className="tl-grid">
        <Field label="Tipo de documento" htmlFor="tl-doctype">
          <Select id="tl-doctype" value={str(filters.document_type)} onChange={(e) => set('document_type', e.target.value)}
            options={[{ value: '', label: 'Cualquiera' }, ...DOC_TYPES]} />
        </Field>
        <Field label="Idioma" htmlFor="tl-lang">
          <Select id="tl-lang" value={str(filters.language)} onChange={(e) => set('language', e.target.value)}
            options={[{ value: '', label: 'Cualquiera' }, { value: 'es', label: 'Español' }, { value: 'en', label: 'Inglés' }]} />
        </Field>
        <Field label="Origen" htmlFor="tl-synth">
          <Select id="tl-synth" value={synth} onChange={(e) => set('is_synthetic', e.target.value === '' ? '' : e.target.value === 'true')}
            options={[{ value: '', label: 'Cualquiera' }, { value: 'false', label: 'Solo documentos reales' }, { value: 'true', label: 'Solo sintéticos' }]} />
        </Field>
        <Field label="Fragmentos a devolver" htmlFor="tl-topk">
          <Input id="tl-topk" type="number" min={1} max={10} value={Number(config.top_k ?? 3)}
            onChange={(e) => onChange({ ...config, top_k: Math.min(10, Math.max(1, Number(e.target.value) || 3)) })} />
        </Field>
      </div>
    </>
  )
}

function SqlReadonly({ config, onChange }: P) {
  return (
    <>
      <Field label="Consulta (solo SELECT)" htmlFor="tl-sql" hint="Parámetros con nombre: %(zona)s. La consulta debe terminar con LIMIT (máximo 50).">
        <Textarea id="tl-sql" className="mono tl-code" rows={6} spellCheck={false} value={str(config.query)}
          onChange={(e) => onChange({ ...config, query: e.target.value })} />
      </Field>
      <div className="tl-help">
        <p className="eyebrow">Vistas autorizadas</p>
        <ul>
          {SQL_VIEWS.map((v) => (
            <li key={v.name}>
              <code>{v.name}</code> <span className="muted">({v.columns})</span>{' '}
              <button type="button" className="tl-link" onClick={() => onChange({ ...config, query: v.example })}>usar ejemplo</button>
            </li>
          ))}
        </ul>
        <p className="hint">
          Reglas: una sola consulta SELECT, sin <code>;</code> ni comentarios, sin subconsultas en FROM, solo funciones básicas
          (count, min, max, lower, any…). Se ejecuta con un rol de solo lectura y 2 s de tiempo máximo. Cada <code>%(nombre)s</code> debe existir en los parámetros.
        </p>
      </div>
    </>
  )
}

function HttpRequest({ config, onChange }: P) {
  const providers = useProviders()
  const hosts = Array.isArray(config.allowed_hosts) ? (config.allowed_hosts as string[]).join('\n') : ''
  const method = str(config.method, 'GET')
  const withSecret = (providers.data ?? []).filter((p) => p.has_secret)
  const secretRef = str(config.secret_ref)
  const patch = (k: string, v: unknown) => {
    const c = { ...config }
    if (v === '' || v === undefined) delete c[k]; else c[k] = v
    onChange(c)
  }
  return (
    <>
      <Banner tone="info">Solo se puede llamar a los servidores de la lista. Se bloquean direcciones internas, redirecciones y respuestas de más de 256 KB; tiempo máximo 5 s.</Banner>
      <div className="tl-grid tl-grid-url">
        <Field label="Método" htmlFor="tl-method">
          <Select id="tl-method" value={method} onChange={(e) => patch('method', e.target.value)} options={[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]} />
        </Field>
        <Field label="URL" htmlFor="tl-url" hint="Use {{ parámetro }} en la ruta o la consulta. El servidor debe ser fijo.">
          <Input id="tl-url" className="mono" value={str(config.url)} onChange={(e) => patch('url', e.target.value)} placeholder="https://api.ejemplo.com/status?zona={{ zona }}" />
        </Field>
      </div>
      <Field label="Servidores permitidos" htmlFor="tl-hosts" hint="Uno por línea, nombre exacto y sin https://.">
        <Textarea id="tl-hosts" className="mono" rows={3} value={hosts}
          onChange={(e) => patch('allowed_hosts', e.target.value.split(/[\n,]/).map((h) => h.trim().toLowerCase()).filter(Boolean))} placeholder="api.ejemplo.com" />
      </Field>
      <div className="tl-grid">
        <Field label="Credencial (opcional)" htmlFor="tl-secret" hint="Se toma de la credencial guardada del proveedor y nunca se muestra.">
          <Select id="tl-secret" value={secretRef} onChange={(e) => patch('secret_ref', e.target.value)}
            options={[{ value: '', label: 'Sin credencial' },
              ...(secretRef && !withSecret.some((p) => `provider:${p.name}` === secretRef) ? [{ value: secretRef, label: secretRef }] : []),
              ...withSecret.map((p) => ({ value: `provider:${p.name}`, label: p.name }))]} />
        </Field>
        <Field label="Encabezado de la credencial" htmlFor="tl-sechdr">
          <Input id="tl-sechdr" disabled={!secretRef} value={str(config.secret_header, 'Authorization')} onChange={(e) => patch('secret_header', e.target.value)} />
        </Field>
        <Field label="Ruta del dato en la respuesta" htmlFor="tl-path" hint="Ejemplo: $.status o data.items.0.name. Vacío = respuesta completa.">
          <Input id="tl-path" className="mono" value={str(config.response_path)} onChange={(e) => patch('response_path', e.target.value)} placeholder="$.status" />
        </Field>
      </div>
      {method === 'POST' && (
        <Field label="Cuerpo (JSON)" htmlFor="tl-body" hint='Ejemplo: {"zona": {{ zona|tojson }} }'>
          <Textarea id="tl-body" className="mono" rows={3} value={str(config.body_template)} onChange={(e) => patch('body_template', e.target.value)} />
        </Field>
      )}
      <label className="check">
        <input type="checkbox" checked={config.allow_http === true} onChange={(e) => patch('allow_http', e.target.checked ? true : '')} />
        Permitir http sin cifrado para estos servidores (no recomendado)
      </label>
    </>
  )
}

function ClientTool({ config, onChange }: P) {
  return (
    <Field label="Acción en el navegador" htmlFor="tl-action" hint="Fase 2: por ahora la herramienta solo responde que requiere el navegador.">
      <Select id="tl-action" value={str(config.client_action, 'browser_connectivity_check')} onChange={(e) => onChange({ ...config, client_action: e.target.value })}
        options={[{ value: 'browser_connectivity_check', label: 'Prueba de conectividad' }, { value: 'browser_speed_test', label: 'Prueba de velocidad' }]} />
    </Field>
  )
}

export const DEFAULT_CONFIG: Record<ToolKind, Cfg> = {
  builtin: {},
  static_template: { template: '' },
  rag_search: { filters: {}, top_k: 3 },
  sql_readonly: { query: '' },
  http_request: { method: 'GET', url: '', allowed_hosts: [] },
  client_tool: { client_action: 'browser_connectivity_check' },
}

export function KindForm({ kind, ...p }: P & { kind: ToolKind }) {
  switch (kind) {
    case 'static_template': return <StaticTemplate {...p} />
    case 'rag_search': return <RagSearch {...p} />
    case 'sql_readonly': return <SqlReadonly {...p} />
    case 'http_request': return <HttpRequest {...p} />
    case 'client_tool': return <ClientTool {...p} />
    default: return <p className="hint">Esta herramienta viene con el sistema: aquí solo se edita la descripción, las intenciones y el estado.</p>
  }
}
