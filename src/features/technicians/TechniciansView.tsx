import { useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/client'
import type { Technician } from '../../shared/api/technicians'
import { Badge, Banner, Button, IconPlus, Loading, Modal, PageHeader, Table } from '../../shared/ui'
import { Progress } from '../../shared/ui/Progress'
import '../tickets/tickets.css'
import { IconClock, IconUsers } from './icons'
import { AVAILABILITY, fmtSchedule } from './meta'
import { TechnicianForm } from './TechnicianForm'
import { humanize, specialtyLabel, useDeactivateTechnician, useTechnicians } from './useTechnicians'
import { WorkloadDrawer } from './WorkloadDrawer'
import './technicians.css'

function Chips({ items, fmt }: { items: string[]; fmt: (s: string) => string }) {
  if (items.length === 0) return <span className="muted">—</span>
  return <span className="tech-chips">{items.map((i) => <span key={i} className="tag">{fmt(i)}</span>)}</span>
}

function Load({ t }: { t: Technician }) {
  if (t.open_tickets == null) return <span className="muted">—</span>
  const r = t.open_tickets / t.max_open_tickets
  return (
    <div className="tech-load">
      <Progress value={r} tone={r >= 1 ? 'warn' : 'accent'} label={`Carga de ${t.name}`} />
      <span className="mono">{t.open_tickets}/{t.max_open_tickets}</span>
    </div>
  )
}

export function TechniciansView() {
  const list = useTechnicians()
  const [editing, setEditing] = useState<Technician | 'new' | null>(null)
  const [load, setLoad] = useState<Technician | null>(null)
  const [off, setOff] = useState<Technician | null>(null)
  const deactivate = useDeactivateTechnician()
  const unavailable = list.error instanceof ApiError && list.error.status === 404

  return (
    <div className="view reveal">
      <PageHeader
        kicker="Operación" title="Técnicos"
        actions={<Button variant="primary" onClick={() => setEditing('new')}><IconPlus size={16} />Nuevo técnico</Button>}
      >
        Personas que atienden los tickets escalados. La asignación automática usa su especialidad, zona, turno y carga.
      </PageHeader>

      {list.isLoading && <Loading label="Leyendo técnicos…" />}
      {list.error && <Banner tone={unavailable ? 'info' : 'error'}>{unavailable ? 'El servicio de técnicos todavía no está disponible.' : errorMessage(list.error)}</Banner>}
      {list.data && (list.data.length === 0 ? (
        <div className="bay bay-compact ticked">
          <div className="bay-icon"><IconUsers size={26} /></div>
          <p className="bay-tag"><span className="led led-off" aria-hidden="true" />Sin técnicos</p>
          <h2 className="bay-title">Todavía no hay técnicos</h2>
          <p className="page-desc">Cree uno para que los tickets escalados tengan a quién asignarse.</p>
        </div>
      ) : (
        <Table
          rows={list.data}
          rowKey={(t) => t.id}
          columns={[
            { header: 'Nombre', render: (t) => (
              <span className={t.is_active === false ? 'tech-off' : undefined}>
                <b className="cell-strong">{t.name}</b>{t.is_active === false && <> <Badge>Inactivo</Badge></>}
              </span>
            ) },
            { header: 'Especialidades', render: (t) => <Chips items={t.specialties} fmt={specialtyLabel} /> },
            { header: 'Zonas', render: (t) => <Chips items={t.zones} fmt={humanize} /> },
            { header: 'Nivel', render: (t) => <Badge tone={t.level === 'n2' ? 'accent' : 'neutral'}>{t.level.toUpperCase()}</Badge> },
            { header: 'Disponibilidad', render: (t) => {
              const a = AVAILABILITY[t.availability] ?? { label: t.availability, tone: 'neutral' as const }
              return <span title={fmtSchedule(t.schedule)}><Badge led tone={a.tone}>{a.label}</Badge></span>
            } },
            { header: 'Carga', className: 'tech-col-load', render: (t) => <Load t={t} /> },
            { header: 'Acciones', render: (t) => (
              <span className="tech-actions">
                <Button size="sm" variant="ghost" onClick={() => setLoad(t)} aria-label={`Ver carga de ${t.name}`}><IconClock size={14} />Carga</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)} aria-label={`Editar a ${t.name}`}>Editar</Button>
                {t.is_active !== false && <Button size="sm" variant="ghost" onClick={() => setOff(t)} aria-label={`Desactivar a ${t.name}`}>Desactivar</Button>}
              </span>
            ) },
          ]}
        />
      ))}

      {editing && <TechnicianForm tech={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {load && <WorkloadDrawer tech={load} onClose={() => setLoad(null)} />}
      {off && (
        <Modal title="Desactivar técnico" onClose={() => setOff(null)}>
          <p>¿Desactivar a <b>{off.name}</b>? Dejará de recibir asignaciones; sus tickets abiertos se conservan.</p>
          {deactivate.error && <Banner tone="error">{errorMessage(deactivate.error)}</Banner>}
          <div className="actions">
            <Button variant="ghost" onClick={() => setOff(null)}>Cancelar</Button>
            <Button variant="danger" disabled={deactivate.isPending} onClick={() => deactivate.mutate(off.id, { onSuccess: () => setOff(null) })}>
              {deactivate.isPending ? 'Desactivando…' : 'Desactivar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
