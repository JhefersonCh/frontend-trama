import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage } from '../../../shared/api/client'
import { activateRule, createRule, getRule, listRules, validateRules, type RuleValidation } from '../../../shared/api/rules'
import { Badge, Banner, Button, Loading, Select, Textarea } from '../../../shared/ui'
import './rules.css'

const errText = (e: RuleValidation['errors'][number]) => (typeof e === 'string' ? e : `${e.line != null ? `Línea ${e.line}: ` : ''}${e.msg ?? e.message ?? JSON.stringify(e)}`)

export function RulesPanel() {
  const qc = useQueryClient()
  const versions = useQuery({ queryKey: ['rules'], queryFn: listRules, retry: false })
  const [version, setVersion] = useState<number | null>(null)
  const [yaml, setYaml] = useState('')
  const [dirty, setDirty] = useState(false)
  const [result, setResult] = useState<RuleValidation | null>(null)

  const list = versions.data ?? []
  const active = list.find((v) => v.is_active)
  useEffect(() => {
    if (version == null && list.length > 0) setVersion((active ?? list[0]).version)
  }, [list, active, version])

  const content = useQuery({ queryKey: ['rules', version], queryFn: () => getRule(version!), enabled: version != null, retry: false })
  useEffect(() => {
    if (content.data?.content_yaml != null) { setYaml(content.data.content_yaml); setDirty(false); setResult(null) }
  }, [content.data])

  const validate = useMutation({ mutationFn: () => validateRules(yaml), onSuccess: setResult })
  const save = useMutation({
    mutationFn: () => createRule(yaml),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['rules'] }); setVersion(r.version); setDirty(false) },
  })
  const activate = useMutation({
    mutationFn: (v: number) => activateRule(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  if (versions.isLoading) return <Loading label="Leyendo reglas…" />
  if (versions.error) {
    const missing = versions.error instanceof ApiError && versions.error.status === 404
    return <Banner tone={missing ? 'info' : 'error'}>{missing ? 'El servicio de reglas todavía no está disponible.' : errorMessage(versions.error)}</Banner>
  }
  const current = list.find((v) => v.version === version)

  return (
    <div className="rules">
      <div className="rules-bar">
        <label htmlFor="rules-ver" className="field-label">Versión</label>
        <Select id="rules-ver" value={version ?? ''} onChange={(e) => setVersion(Number(e.target.value))}
          options={list.map((v) => ({ value: String(v.version), label: `v${v.version}${v.is_active ? ' · activa' : ''}` }))} />
        {current?.is_active ? <Badge led tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
        {dirty && <Badge tone="warning">Cambios sin guardar</Badge>}
      </div>
      {content.isLoading && <Loading label="Leyendo versión…" />}
      <label htmlFor="rules-yaml" className="sr-only">Contenido YAML de las reglas</label>
      <Textarea id="rules-yaml" className="mono rules-yaml" rows={22} spellCheck={false} value={yaml}
        onChange={(e) => { setYaml(e.target.value); setDirty(true); setResult(null) }} />

      {result && (result.ok
        ? <Banner tone="success">El YAML es válido.</Banner>
        : <Banner tone="error"><b>Se encontraron errores:</b><ul className="rules-errs">{result.errors.map((e, i) => <li key={i}>{errText(e)}</li>)}</ul></Banner>)}
      {(validate.error || save.error || activate.error) && <Banner tone="error">{errorMessage(validate.error ?? save.error ?? activate.error)}</Banner>}
      {activate.isSuccess && <Banner tone="success">Versión activada. El agente la usa desde el próximo turno.</Banner>}

      <div className="actions rules-actions">
        <Button onClick={() => validate.mutate()} disabled={!yaml.trim() || validate.isPending}>{validate.isPending ? 'Validando…' : 'Validar'}</Button>
        <Button onClick={() => save.mutate()} disabled={!yaml.trim() || !dirty || save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar como versión nueva'}</Button>
        <Button variant="primary" onClick={() => version != null && activate.mutate(version)} disabled={version == null || dirty || !!current?.is_active || activate.isPending}>
          {activate.isPending ? 'Activando…' : 'Activar esta versión'}
        </Button>
      </div>
      <p className="hint">Una versión guardada queda inactiva hasta que se active. No se puede activar con cambios sin guardar.</p>
    </div>
  )
}
