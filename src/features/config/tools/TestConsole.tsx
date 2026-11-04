import { useState } from 'react'
import { Badge, Banner, Button, Field, Input, Select } from '../../../shared/ui'
import { errorMessage } from '../../../shared/api/client'
import type { Tool } from '../../../shared/api/tools'
import { useToolMutations } from './useTools'

type Prop = { type?: string; description?: string; enum?: unknown[] }

/** Form generated from the saved params_schema -> run -> raw output / time / error. */
export function TestConsole({ tool }: { tool: Tool }) {
  const { test } = useToolMutations()
  const props = (tool.params_schema.properties ?? {}) as Record<string, Prop>
  const required = new Set(tool.params_schema.required ?? [])
  const [vals, setVals] = useState<Record<string, string | boolean>>({})
  const [localErr, setLocalErr] = useState<string | null>(null)

  const run = () => {
    const args: Record<string, unknown> = {}
    for (const [k, p] of Object.entries(props)) {
      const v = vals[k]
      if (p.type === 'boolean') { args[k] = v === true; continue }
      if (v === undefined || v === '') {
        if (required.has(k)) { setLocalErr(`Falta el parámetro «${k}».`); return }
        continue
      }
      if (p.type === 'integer' || p.type === 'number') {
        const n = Number(v)
        if (Number.isNaN(n)) { setLocalErr(`«${k}» debe ser un número.`); return }
        args[k] = p.type === 'integer' ? Math.trunc(n) : n
      } else if (p.type === 'array' || p.type === 'object') {
        try { args[k] = JSON.parse(String(v)) } catch { setLocalErr(`«${k}» debe ser JSON válido.`); return }
      } else args[k] = String(v)
    }
    setLocalErr(null)
    test.mutate({ id: tool.id, args })
  }

  const r = test.data
  return (
    <div className="tl-console">
      <p className="hint">Ejecuta la versión guardada (v{tool.version}), aunque esté desactivada. Se permiten 10 pruebas por minuto.</p>
      {Object.keys(props).length === 0 && <p className="muted">Esta herramienta no recibe parámetros.</p>}
      {Object.entries(props).map(([k, p]) => {
        const id = `tl-test-${k}`
        const label = `${k}${required.has(k) ? ' *' : ''}`
        const hint = p.description
        if (p.type === 'boolean') {
          return <label className="check" key={k}><input type="checkbox" checked={vals[k] === true} onChange={(e) => setVals({ ...vals, [k]: e.target.checked })} /> {k}</label>
        }
        if (Array.isArray(p.enum)) {
          return <Field key={k} label={label} htmlFor={id} hint={hint}><Select id={id} value={String(vals[k] ?? '')} onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
            options={[{ value: '', label: '—' }, ...p.enum.map((o) => ({ value: String(o), label: String(o) }))]} /></Field>
        }
        return (
          <Field key={k} label={label} htmlFor={id} hint={hint}>
            <Input id={id} className={p.type === 'array' || p.type === 'object' ? 'mono' : ''} type={p.type === 'integer' || p.type === 'number' ? 'number' : 'text'}
              value={String(vals[k] ?? '')} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder={p.type === 'array' ? '[]' : p.type === 'object' ? '{}' : ''} />
          </Field>
        )
      })}
      <div className="actions tl-run">
        <Button variant="primary" onClick={run} disabled={test.isPending}>{test.isPending ? 'Ejecutando…' : 'Ejecutar prueba'}</Button>
      </div>
      {localErr && <Banner tone="warning">{localErr}</Banner>}
      {test.error && <Banner tone="error">{errorMessage(test.error)}</Banner>}
      {r && (
        <div className="tl-result" data-ok={r.ok}>
          <div className="tl-result-head">
            <Badge led tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'Correcto' : 'Con error'}</Badge>
            <span className="mono muted">{r.duration_ms} ms</span>
          </div>
          {r.error && <p className="tl-err">{r.error}</p>}
          {r.ok && <pre className="tl-out mono">{JSON.stringify(r.output, null, 2)}</pre>}
        </div>
      )}
    </div>
  )
}
