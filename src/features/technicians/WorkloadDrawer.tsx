import { ApiError, errorMessage } from '../../shared/api/client'
import type { Technician } from '../../shared/api/technicians'
import { Banner, Loading } from '../../shared/ui'
import { Progress } from '../../shared/ui/Progress'
import { Drawer } from '../../shared/ui/Drawer'
import { fmtDate, STATUS } from '../tickets/meta'
import { fmtSchedule } from './meta'
import { useWorkload } from './useTechnicians'
import './technicians.css'

export function WorkloadDrawer({ tech, onClose }: { tech: Technician; onClose: () => void }) {
  const q = useWorkload(tech.id)
  const w = q.data
  const max = w?.max_open_tickets ?? tech.max_open_tickets
  const missing = q.error instanceof ApiError && q.error.status === 404
  return (
    <Drawer label={`Carga de ${tech.name}`} eyebrow="Carga de trabajo" title={tech.name} onClose={onClose}>
      {q.isLoading && <Loading label="Leyendo carga…" />}
      {q.error && <Banner tone={missing ? 'info' : 'error'}>{missing ? 'Todavía no hay datos de carga para este técnico.' : errorMessage(q.error)}</Banner>}
      {w && (
        <>
          <section className="drawer-sec">
            <h4 className="eyebrow">Capacidad</h4>
            <p className="wl-big"><b>{w.open_tickets}</b><span className="muted"> de {max} tickets abiertos</span></p>
            <Progress value={max ? w.open_tickets / max : 0} tone={w.open_tickets >= max ? 'warn' : 'accent'} label="Carga actual" />
          </section>
          <section className="drawer-sec">
            <h4 className="eyebrow">Por estado</h4>
            {w.by_status && Object.keys(w.by_status).length > 0 ? (
              <ul className="wl-status">
                {Object.entries(w.by_status).map(([k, n]) => (
                  <li key={k}><span>{STATUS[k as keyof typeof STATUS]?.label ?? k}</span><b className="mono">{n}</b></li>
                ))}
              </ul>
            ) : <p className="dx-none">Sin tickets abiertos.</p>}
          </section>
          <section className="drawer-sec">
            <h4 className="eyebrow">Próximo plazo</h4>
            <p className="mono">{w.next_due ? fmtDate(w.next_due) : 'Sin plazos pendientes'}</p>
          </section>
          {w.tickets && w.tickets.length > 0 && (
            <section className="drawer-sec">
              <h4 className="eyebrow">Tickets abiertos · {w.tickets.length}</h4>
              <ul className="wl-tickets">
                {w.tickets.map((t) => (
                  <li key={t.ticket_number}><span className="mono">{t.ticket_number}</span><span className="clip">{t.title ?? ''}</span><span className="mono muted">{fmtDate(t.sla_due_at)}</span></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <section className="drawer-sec">
        <h4 className="eyebrow">Turnos</h4>
        <p className="dx-text">{fmtSchedule(tech.schedule)}</p>
      </section>
    </Drawer>
  )
}
