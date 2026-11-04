import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../shared/api/client'
import type { Technician, TechAvailability, TechLevel } from '../../shared/api/technicians'
import { Banner, Button, Field, IconClose, IconPlus, Input, Modal, Select } from '../../shared/ui'
import { availabilityOptions, DAY_RANGES, LEVELS } from './meta'
import { humanize, SPECIALTIES, useSaveTechnician, useZones } from './useTechnicians'

type Row = { days: string; from: string; to: string }

function toRows(t?: Technician): Row[] {
  const e = Object.entries(t?.schedule ?? { 'lun-vie': ['08:00', '17:00'] })
  return e.map(([days, v]) => ({ days, from: v[0] ?? '08:00', to: v[1] ?? '17:00' }))
}

function ChipPicker({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="field">
      <span className="field-label" id={`pick-${label}`}>{label}</span>
      <div className="filters tech-picker" role="group" aria-labelledby={`pick-${label}`}>
        {options.map((o) => (
          <button key={o.value} type="button" className="chip" aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function TechnicianForm({ tech, onClose }: { tech?: Technician; onClose: () => void }) {
  const zones = useZones()
  const [name, setName] = useState(tech?.name ?? '')
  const [level, setLevel] = useState<TechLevel>(tech?.level ?? 'n1')
  const [max, setMax] = useState(String(tech?.max_open_tickets ?? 5))
  const [availability, setAvailability] = useState<TechAvailability>(tech?.availability ?? 'disponible')
  const [contact, setContact] = useState(tech?.contact_channel ?? '')
  const [specialties, setSpecialties] = useState<string[]>(tech?.specialties ?? [])
  const [zoneSel, setZoneSel] = useState<string[]>(tech?.zones ?? [])
  const [rows, setRows] = useState<Row[]>(toRows(tech))
  const save = useSaveTechnician(tech?.id)

  const zoneOptions = [...new Set([...zones, ...zoneSel])].map((z) => ({ value: z, label: humanize(z) }))
  const maxNum = Number(max)
  const valid = name.trim().length > 0 && Number.isInteger(maxNum) && maxNum > 0 && rows.every((r) => r.from < r.to)
  const setRow = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({
      name: name.trim(), level, availability, specialties, zones: zoneSel, max_open_tickets: maxNum,
      contact_channel: contact.trim() || null,
      schedule: Object.fromEntries(rows.map((r) => [r.days, [r.from, r.to]])),
    }, { onSuccess: onClose })
  }

  return (
    <Modal title={tech ? 'Editar técnico' : 'Nuevo técnico'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre" htmlFor="tc-name">
          <Input id="tc-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Nivel" htmlFor="tc-level">
            <Select id="tc-level" options={LEVELS} value={level} onChange={(e) => setLevel(e.target.value as TechLevel)} />
          </Field>
          <Field label="Disponibilidad" htmlFor="tc-av">
            <Select id="tc-av" options={availabilityOptions} value={availability} onChange={(e) => setAvailability(e.target.value as TechAvailability)} />
          </Field>
        </div>
        <ChipPicker label="Especialidades" options={SPECIALTIES} value={specialties} onChange={setSpecialties} />
        <ChipPicker label="Zonas" options={zoneOptions} value={zoneSel} onChange={setZoneSel} />
        <p className="hint tech-hint">Sin zonas, el técnico puede atender cualquier zona.</p>
        <div className="form-row">
          <Field label="Tickets abiertos máximos" htmlFor="tc-max">
            <Input id="tc-max" type="number" min={1} max={50} value={max} onChange={(e) => setMax(e.target.value)} />
          </Field>
          <Field label="Contacto de trabajo" htmlFor="tc-contact" hint="Usuario interno o correo de trabajo">
            <Input id="tc-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <span className="field-label">Turnos (hora de Colombia)</span>
          <ul className="sched">
            {rows.map((r, i) => (
              <li key={i} className="sched-row">
                <Select aria-label="Días" options={DAY_RANGES} value={r.days} onChange={(e) => setRow(i, { days: e.target.value })} />
                <Input aria-label="Desde" type="time" value={r.from} onChange={(e) => setRow(i, { from: e.target.value })} />
                <Input aria-label="Hasta" type="time" value={r.to} onChange={(e) => setRow(i, { to: e.target.value })} />
                <button type="button" className="icon-btn" aria-label="Quitar turno" onClick={() => setRows(rows.filter((_, j) => j !== i))}><IconClose size={14} /></button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { days: 'sab', from: '08:00', to: '12:00' }])}><IconPlus size={14} />Agregar turno</Button>
          {rows.some((r) => r.from >= r.to) && <small className="field-error" role="alert">La hora de inicio debe ser anterior a la de fin.</small>}
        </div>
        {save.error && <Banner tone="error">{errorMessage(save.error)}</Banner>}
        <div className="actions">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!valid || save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
