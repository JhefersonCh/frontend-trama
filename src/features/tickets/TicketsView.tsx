import { useState } from 'react'
import { errorMessage } from '../../shared/api/client'
import type { TicketStatus, TicketSummary } from '../../shared/api/tickets'
import { Badge, Banner, Button, IconPlus, IconTicket, Loading, PageHeader, Select, Table } from '../../shared/ui'
import { useTechnicians } from '../technicians/useTechnicians'
import { SlaChip } from './TicketBits'
import { fmtDate, PRIORITY, STATUS } from './meta'
import { NewTicketModal } from './NewTicketModal'
import { TicketDrawer } from './TicketDrawer'
import { useTicketList } from './useTickets'
import './tickets.css'

const FILTERS: { key: TicketStatus | ''; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'in_progress', label: 'En curso' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'closed', label: 'Cerrados' },
]

export function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STATUS[status] ?? { label: status, tone: 'neutral' as const }
  return <Badge led tone={s.tone}>{s.label}</Badge>
}
export function PriorityBadge({ priority }: { priority: TicketSummary['priority'] }) {
  const p = PRIORITY[priority] ?? { label: priority, tone: 'neutral' as const }
  return <Badge tone={p.tone} led={priority === 'critical'}>{p.label}</Badge>
}

export function TicketsView() {
  const [filter, setFilter] = useState<TicketStatus | ''>('')
  const [openTicket, setOpenTicket] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [unassigned, setUnassigned] = useState(false)
  const [viewAs, setViewAs] = useState('')
  const techs = useTechnicians()
  const list = useTicketList({ status: filter, unassigned, technicianId: viewAs || undefined })

  return (
    <div className="view reveal">
      <PageHeader
        index="03" kicker="Escalamiento" title="Tickets"
        actions={<Button variant="primary" onClick={() => setCreating(true)}><IconPlus size={16} />Nuevo ticket</Button>}
      >
        Casos que el agente no pudo resolver, con el contexto técnico listo para que soporte los tome.
      </PageHeader>

      <div className="filters" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'} type="button" className="chip" aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.key && <span className={`chip-led chip-led-${STATUS[f.key].tone}`} aria-hidden="true" />}
            {f.label}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={unassigned} onClick={() => { setUnassigned(!unassigned); setViewAs('') }}>
          <span className="chip-led chip-led-warn" aria-hidden="true" />Sin asignar
        </button>
        {techs.data && techs.data.length > 0 && (
          <label className="view-as">Ver como
            <Select aria-label="Ver como técnico" value={viewAs}
              onChange={(e) => { setViewAs(e.target.value); setUnassigned(false) }}
              options={[{ value: '', label: 'Todos' }, ...techs.data.filter((t) => t.is_active !== false).map((t) => ({ value: t.id, label: t.name }))]} />
          </label>
        )}
        {list.data && <span className="section-meta filters-count">{list.data.length} {list.data.length === 1 ? 'ticket' : 'tickets'}</span>}
      </div>

      {list.isLoading && <Loading label="Leyendo tickets…" />}
      {list.error && <Banner tone="error">{errorMessage(list.error)}</Banner>}
      {list.data && (list.data.length === 0 ? (
        <div className="bay bay-compact ticked">
          <div className="bay-icon"><IconTicket size={26} /></div>
          <p className="bay-tag"><span className="led led-off" aria-hidden="true" />{filter || unassigned || viewAs ? 'Sin coincidencias' : 'Bandeja vacía'}</p>
          <h2 className="bay-title">{filter || unassigned || viewAs ? 'No hay tickets con este filtro' : 'Todavía no hay tickets'}</h2>
          <p className="page-desc">{filter || unassigned || viewAs ? 'Pruebe con otro filtro.' : 'Cuando el agente escale un caso, o cuando cree uno a mano, va a aparecer aquí.'}</p>
        </div>
      ) : (
        <Table
          rows={list.data}
          rowKey={(t) => t.ticket_number}
          columns={[
            { header: 'Ticket', render: (t) => (
              <button type="button" className="ticket-link" onClick={() => setOpenTicket(t.ticket_number)} aria-label={`Abrir ticket ${t.ticket_number}`}>{t.ticket_number}</button>
            ) },
            { header: 'Título', render: (t) => <span className="cell-strong clip ticket-title" title={t.title}>{t.title}</span> },
            { header: 'Estado', render: (t) => <StatusBadge status={t.status} /> },
            { header: 'Prioridad', render: (t) => <PriorityBadge priority={t.priority} /> },
            { header: 'Técnico', render: (t) => t.technician_name ? <span>{t.technician_name}</span> : <Badge tone="warning">Sin asignar</Badge> },
            { header: 'Plazo', className: 'sla-cell', render: (t) => <SlaChip due={t.sla_due_at} start={t.created_at} closed={t.status === 'resolved' || t.status === 'closed'} /> },
            { header: 'Actualizado', className: 'col-mono', render: (t) => fmtDate(t.updated_at) },
          ]}
        />
      ))}

      {openTicket && <TicketDrawer number={openTicket} summary={list.data?.find((t) => t.ticket_number === openTicket)} onClose={() => setOpenTicket(null)} />}
      {creating && <NewTicketModal onClose={() => setCreating(false)} onCreated={(n) => { setCreating(false); setOpenTicket(n) }} />}
    </div>
  )
}
