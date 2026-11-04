import { useState, type FormEvent } from 'react'
import { Badge, Banner, Button, Field, Input, Loading, Select, Textarea } from '../../../shared/ui'
import { Drawer } from '../../../shared/ui/Drawer'
import { errorMessage } from '../../../shared/api/client'
import type { JsonSchema, Tool, ToolInput, ToolKind } from '../../../shared/api/tools'
import { fmtDate } from '../../tickets/meta'
import { DEFAULT_CONFIG, KindForm } from './KindForms'
import { SchemaEditor } from './SchemaEditor'
import { TestConsole } from './TestConsole'
import { CREATABLE_KINDS, INTENTS, KIND } from './meta'
import { useToolMutations, useToolVersions } from './useTools'
import './tools.css'

const EMPTY_SCHEMA: JsonSchema = { type: 'object', properties: {} }

function Versions({ tool }: { tool: Tool }) {
  const q = useToolVersions(tool.id)
  if (q.isLoading) return <Loading label="Leyendo versiones…" />
  if (q.error) return <Banner tone="error">{errorMessage(q.error)}</Banner>
  return (
    <ul className="tl-versions">
      {(q.data ?? []).map((v) => (
        <li key={v.version}>
          <details>
            <summary>
              <b className="mono">v{v.version}</b>{v.version === tool.version && <Badge tone="accent">actual</Badge>}
              <span className="muted mono">{fmtDate(v.created_at)}</span>
            </summary>
            <pre className="tl-out mono">{JSON.stringify(v.snapshot, null, 2)}</pre>
          </details>
        </li>
      ))}
    </ul>
  )
}

export function ToolDrawer({ tool, onClose }: { tool?: Tool; onClose: () => void }) {
  const { save } = useToolMutations()
  const isNew = !tool
  const [name, setName] = useState(tool?.name ?? '')
  const [kind, setKind] = useState<ToolKind>(tool?.kind ?? 'static_template')
  const [description, setDescription] = useState(tool?.description ?? '')
  const [intents, setIntents] = useState<string[]>(tool?.intents ?? [])
  const [custom, setCustom] = useState('')
  const [enabled, setEnabled] = useState(tool?.enabled ?? true)
  const [config, setConfig] = useState<Record<string, unknown>>(tool?.config ?? DEFAULT_CONFIG[kind])
  const [schema, setSchema] = useState<JsonSchema | null>(tool?.params_schema ?? EMPTY_SCHEMA)
  const [saved, setSaved] = useState(false)

  const builtin = (tool?.kind ?? kind) === 'builtin'
  const nameOk = !isNew || /^[a-z][a-z0-9_]{2,40}$/.test(name)
  const known = new Set(INTENTS.map((i) => i.value))
  const extras = intents.filter((i) => !known.has(i))
  const toggleIntent = (v: string) => setIntents((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
  const valid = nameOk && description.trim().length >= 3 && (builtin || schema !== null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    if (isNew) {
      const body: ToolInput = { name, kind, description: description.trim(), params_schema: schema ?? EMPTY_SCHEMA, config, intents, enabled }
      save.mutate({ body }, { onSuccess: onClose })
    } else {
      const body = builtin
        ? { description: description.trim(), intents, enabled }
        : { description: description.trim(), intents, enabled, config, params_schema: schema ?? undefined }
      save.mutate({ id: tool.id, body }, { onSuccess: () => setSaved(true) })
    }
  }

  return (
    <Drawer label={isNew ? 'Nueva herramienta' : `Herramienta ${tool.name}`} eyebrow={isNew ? 'Nueva herramienta' : `Herramienta · v${tool.version}`}
      title={isNew ? 'Configurar herramienta' : <span className="mono">{tool.name}</span>} onClose={onClose}>
      <form className="form tl-form" onSubmit={submit}>
        <section className="tl-sec">
          <h4 className="eyebrow">General</h4>
          {isNew && (
            <div className="tl-grid">
              <Field label="Nombre" htmlFor="tl-name" hint="Minúsculas, números y guion bajo. No se puede cambiar después."
                error={name && !nameOk ? 'Use 3 a 41 caracteres: letras minúsculas, números y _.' : null}>
                <Input id="tl-name" className="mono" value={name} onChange={(e) => setName(e.target.value)} required placeholder="horario_soporte" />
              </Field>
              <Field label="Tipo" htmlFor="tl-kind" hint={KIND[kind].help}>
                <Select id="tl-kind" value={kind} options={CREATABLE_KINDS.map((k) => ({ value: k, label: KIND[k].label }))}
                  onChange={(e) => { const k = e.target.value as ToolKind; setKind(k); setConfig(DEFAULT_CONFIG[k]) }} />
              </Field>
            </div>
          )}
          {!isNew && <p className="tl-kindline"><Badge tone={KIND[tool.kind].tone}>{KIND[tool.kind].label}</Badge> <span className="muted">{KIND[tool.kind].help}</span></p>}
          <Field label="Descripción para el modelo" htmlFor="tl-desc" hint="Corta y precisa: el modelo decide con ella cuándo usar la herramienta.">
            <Textarea id="tl-desc" rows={2} maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Field>
          <fieldset className="tl-intents">
            <legend>Intenciones en las que se ofrece</legend>
            <div className="tl-chips">
              {INTENTS.map((i) => (
                <button type="button" key={i.value} className="tl-chip" aria-pressed={intents.includes(i.value)} onClick={() => toggleIntent(i.value)}>{i.label}</button>
              ))}
              {extras.map((v) => <button type="button" key={v} className="tl-chip" aria-pressed onClick={() => toggleIntent(v)}>{v}</button>)}
            </div>
            <div className="tl-addintent">
              <Input aria-label="Otra intención" className="mono" value={custom} placeholder="otra_intencion" onChange={(e) => setCustom(e.target.value)} />
              <Button size="sm" disabled={!/^[a-z][a-z_]{0,29}$/.test(custom)} onClick={() => { toggleIntent(custom); setCustom('') }}>Agregar</Button>
            </div>
            <p className="hint">El modelo ve como máximo 3 herramientas por intención. Sin intenciones, solo se puede usar desde reglas y pruebas.</p>
          </fieldset>
          <label className="check"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Activa</label>
        </section>

        {!builtin && (
          <section className="tl-sec">
            <h4 className="eyebrow">Parámetros</h4>
            <SchemaEditor value={schema ?? EMPTY_SCHEMA} onChange={setSchema} />
          </section>
        )}
        <section className="tl-sec">
          <h4 className="eyebrow">Configuración</h4>
          <KindForm kind={tool?.kind ?? kind} config={config} onChange={setConfig} schema={schema ?? EMPTY_SCHEMA} />
        </section>

        {save.error && <Banner tone="error">{errorMessage(save.error)}</Banner>}
        {saved && <Banner tone="success">Guardado. Se creó una versión nueva y el agente la usa desde el próximo turno.</Banner>}
        <div className="actions">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="primary" type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Guardando…' : isNew ? 'Crear herramienta' : 'Guardar versión nueva'}</Button>
        </div>
      </form>

      {tool && (
        <>
          <section className="tl-sec"><h4 className="eyebrow">Consola de prueba</h4><TestConsole key={`${tool.id}-${tool.version}`} tool={tool} /></section>
          <section className="tl-sec"><h4 className="eyebrow">Versiones</h4><Versions tool={tool} /></section>
        </>
      )}
    </Drawer>
  )
}
