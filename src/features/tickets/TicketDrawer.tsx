import { useState, type ComponentType } from 'react'
import { ApiError, errorMessage } from '../../shared/api/client'
import type { TicketEvent, TicketPriority, TicketStatus, TicketSummary } from '../../shared/api/tickets'
import { Badge, Banner, Button, IconAlert, IconCheck, IconPlus, IconTicket, Loading, Select, Textarea } from '../../shared/ui'
import { Drawer } from '../../shared/ui/Drawer'
import { IconNote, IconPhone, IconQueue, IconShuffle, IconUserCheck } from '../technicians/icons'
import { humanize, specialtyLabel, useTechnicians } from '../technicians/useTechnicians'
import { CATEGORIES, fmtDate, fmtValue, priorityOptions, statusOptions } from './meta'
import { ContactLock, HandoffView, SlaChip } from './TicketBits'
import { PriorityBadge, StatusBadge } from './TicketsView'
import { useAddNote, useAssignTicket, usePatchTicket, useTicketDetail, useTicketTimeline } from './useTickets'

type Ico = ComponentType<{ size?: number }>
const EVENT: Record<string, { label: string; icon: Ico; tone?: 'warn' | 'err' | 'ok' }> = {
  created: { label: 'Ticket creado', icon: IconPlus },
  status_changed: { label: 'Cambio de estado', icon: IconTicket },
  priority_changed: { label: 'Cambio de prioridad', icon: IconAlert },
  comment: { label: 'Comentario', icon: IconNote },
  assigned: { label: 'Asignado a un técnico', icon: IconUserCheck, tone: 'ok' },
  reassigned: { label: 'Reasignado', icon: IconShuffle, tone: 'warn' },
  unassigned_queue: { label: 'En cola sin técnico', icon: IconQueue, tone: 'warn' },
  technician_note: { label: 'Nota del técnico', icon: IconNote },
  sla_warning: { label: 'Plazo por vencer', icon: IconAlert, tone: 'warn' },
  sla_breached: { label: 'Plazo vencido', icon: IconAlert, tone: 'err' },
  customer_followup: { label: 'Seguimiento a la persona', icon: IconPhone },
  evidence_added: { label: 'Evidencia agregada', icon: IconCheck },
}

/** Pull a readable sentence out of an event's `details` (string, or an object with reason/text/note). */
function detailText(d: unknown): string | null {
  if (d == null || d === '') return null
  if (typeof d === 'string') return d
  if (typeof d === 'object') {
    const o = d as Record<string, unknown>
    const parts = [o.technician_name, o.reason, o.text, o.note, o.message].filter((x): x is string => typeof x === 'string' && x !== '')
    if (parts.length) return parts.join(' · ')
  }
  return JSON.stringify(d)
}

function Timeline({ events }: { events: TicketEvent[] }) {
  if (events.length === 0) return <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />Sin eventos registrados</div>
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return (
    <ol className="timeline tl-icons">
      {sorted.map((e, i) => {
        const meta = EVENT[e.event_type]
        const Icon = meta?.icon
        const txt = detailText(e.details)
        return (
          <li key={i} className={`tl-item${meta?.tone ? ` tl-${meta.tone}` : ''}`}>
            <span className="tl-node" aria-hidden="true">{Icon && <Icon size={11} />}</span>
            <div className="tl-head">
              <span className="tl-type">{meta?.label ?? humanize(e.event_type)}</span>
              <time className="tl-time">{fmtDate(e.created_at)}</time>
            </div>
            {(e.old_value != null || e.new_value != null) && !['assigned', 'reassigned', 'technician_note'].includes(e.event_type) && (
              <p className="tl-change"><code>{fmtValue(e.old_value)}</code><span aria-hidden="true"> → </span><code>{fmtValue(e.new_value)}</code></p>
            )}
            {txt && <p className="tl-details">{txt}</p>}
          </li>
        )
      })}
    </ol>
  )
}

function Evidence({ items }: { items: unknown[] }) {
  return (
    <ul className="evidence">
      {items.map((it, i) => (
        <li key={i}>{typeof it === 'string' ? <span>{it}</span> : <pre>{JSON.stringify(it, null, 2)}</pre>}</li>
      ))}
    </ul>
  )
}

function AssignSection({ n, closed, techId, tech }: {
  n: string; closed: boolean; techId?: string | null
  tech?: { id: string; name: string; level?: string; specialties?: string[]; zones?: string[] } | null
}) {
  const techs = useTechnicians()
  const assign = useAssignTicket()
  const note = useAddNote()
  const [pick, setPick] = useState('')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const options = (techs.data ?? []).filter((t) => t.is_active !== false)
  const authorId = author || techId || options[0]?.id || ''
  const err = assign.error ?? note.error

  return (
    <section className="drawer-sec">
      <h4 className="eyebrow">Asignación</h4>
      {tech ? (
        <div className="tech-card">
          <span className="tech-avatar" aria-hidden="true">{tech.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <b className="cell-strong">{tech.name}</b>
            <p className="tech-meta">
              {tech.level && <Badge tone={tech.level === 'n2' ? 'accent' : 'neutral'}>{tech.level.toUpperCase()}</Badge>}
              {(tech.specialties ?? []).map((s) => <span key={s} className="tag">{specialtyLabel(s)}</span>)}
              {(tech.zones ?? []).map((z) => <span key={z} className="tag">{humanize(z)}</span>)}
            </p>
          </div>
        </div>
      ) : (
        <Banner tone="warning">Este ticket está sin asignar.</Banner>
      )}

      {!closed && (
        <div className="assign-actions">
          <Button variant="primary" disabled={assign.isPending} onClick={() => assign.mutate({ n, body: { auto: true } })}>
            <IconShuffle size={15} />{assign.isPending ? 'Asignando…' : 'Asignar automáticamente'}
          </Button>
          <div className="assign-pick">
            <label className="sr-only" htmlFor="as-tech">Elegir técnico</label>
            <Select id="as-tech" value={pick} onChange={(e) => setPick(e.target.value)}
              options={[{ value: '', label: 'Elegir técnico…' }, ...options.map((t) => ({ value: t.id, label: `${t.name} (${t.level.toUpperCase()})` }))]} />
            <Button disabled={!pick || assign.isPending} onClick={() => assign.mutate({ n, body: { technician_id: pick } }, { onSuccess: () => setPick('') })}>Asignar</Button>
          </div>
        </div>
      )}
      {assign.isSuccess && <p className="hint ok-note" role="status">Asignación registrada.</p>}

      <div className="note-form">
        <label htmlFor="nt-text" className="field-label">Agregar nota</label>
        <Textarea id="nt-text" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nota del técnico; la persona recibirá un aviso" />
        <div className="note-row">
          <label className="sr-only" htmlFor="nt-author">Autor de la nota</label>
          <Select id="nt-author" value={authorId} onChange={(e) => setAuthor(e.target.value)}
            options={options.length ? options.map((t) => ({ value: t.id, label: t.name })) : [{ value: '', label: 'Sin técnicos' }]} />
          <Button disabled={!text.trim() || !authorId || note.isPending}
            onClick={() => note.mutate({ n, technician_id: authorId, text: text.trim() }, { onSuccess: () => setText('') })}>
            {note.isPending ? 'Guardando…' : 'Agregar nota'}
          </Button>
        </div>
      </div>
      {err && <Banner tone="error">{errorMessage(err)}</Banner>}
    </section>
  )
}

export function TicketDrawer({ number, summary, onClose }: { number: string; summary?: TicketSummary; onClose: () => void }) {
  const q = useTicketDetail(number)
  const tl = useTicketTimeline(number)
  const patch = usePatchTicket()
  const t = q.data ?? summary
  const category = t && 'category' in t ? CATEGORIES.find((c) => c.value === t.category)?.label ?? (t.category as string | null | undefined) : null
  const change = (p: { status?: TicketStatus; priority?: TicketPriority }) => patch.mutate({ n: number, patch: p })
  const tdata = tl.data
  const events = tdata?.events ?? q.data?.events ?? []
  const due = tdata?.sla_due_at ?? summary?.sla_due_at
  const closed = t ? t.status === 'resolved' || t.status === 'closed' : false
  const timelineMissing = tl.error instanceof ApiError && tl.error.status === 404

  return (
    <Drawer label={`Ticket ${number}`} eyebrow={<span className="mono">{number}</span>} title={t?.title ?? 'Ticket'} onClose={onClose}>
      {q.isLoading && !t && <Loading label="Leyendo ticket…" />}
      {q.error && <Banner tone="error">{errorMessage(q.error)}</Banner>}
      {patch.error && <Banner tone="error">No se pudo actualizar: {errorMessage(patch.error)}</Banner>}
      {tl.error && !timelineMissing && <Banner tone="error">{errorMessage(tl.error)}</Banner>}
      {t && (
        <>
          <div className="drawer-controls">
            <div className="field">
              <label htmlFor="t-status">Estado</label>
              <Select id="t-status" options={statusOptions} value={t.status} onChange={(e) => change({ status: e.target.value as TicketStatus })} />
            </div>
            <div className="field">
              <label htmlFor="t-priority">Prioridad</label>
              <Select id="t-priority" options={priorityOptions} value={t.priority} onChange={(e) => change({ priority: e.target.value as TicketPriority })} />
            </div>
          </div>
          <div className="drawer-badges">
            <StatusBadge status={t.status} /><PriorityBadge priority={t.priority} />
            <SlaChip due={due} start={tdata?.opened_at ?? t.created_at} closed={closed} />
            {tdata?.has_contact && <ContactLock />}
            {category && <span className="tag">{category}</span>}
            {q.data?.site && <span className="tag">Sitio: {q.data.site}</span>}
          </div>

          <AssignSection n={number} closed={closed} techId={tdata?.technician?.id ?? summary?.technician_id} tech={tdata?.technician} />

          <section className="drawer-sec">
            <h4 className="eyebrow">Incidente</h4>
            {q.data?.description ? <p className="incident">{q.data.description}</p> : <p className="hint">{q.isLoading ? 'Cargando…' : 'Sin descripción.'}</p>}
          </section>

          {tdata?.handoff_summary && (
            <section className="drawer-sec">
              <h4 className="eyebrow">Resumen para el técnico</h4>
              <HandoffView h={tdata.handoff_summary} sessionId={tdata.session_id} />
            </section>
          )}

          {q.data?.evidence && q.data.evidence.length > 0 && (
            <section className="drawer-sec">
              <h4 className="eyebrow">Evidencia · {q.data.evidence.length}</h4>
              <Evidence items={q.data.evidence} />
            </section>
          )}

          <section className="drawer-sec">
            <h4 className="eyebrow">Línea de tiempo</h4>
            {q.data || tdata ? <Timeline events={events} /> : <Loading label="Cargando eventos…" />}
          </section>
        </>
      )}
    </Drawer>
  )
}
