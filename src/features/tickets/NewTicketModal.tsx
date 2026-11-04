import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../shared/api/client'
import type { TicketCategory, TicketPriority } from '../../shared/api/tickets'
import { Banner, Button, Field, Input, Modal, Select, Textarea } from '../../shared/ui'
import { CATEGORIES, priorityOptions } from './meta'
import { useCreateTicket } from './useTickets'

export function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (n: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('connectivity')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const create = useCreateTicket()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(
      { title: title.trim(), description: description.trim(), category, priority, session_id: null, evidence: [] },
      { onSuccess: (t) => onCreated(t.ticket_number) },
    )
  }

  return (
    <Modal title="Nuevo ticket" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Título" htmlFor="nt-title">
          <Input id="nt-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Sin IP en la sala de cómputo" autoFocus />
        </Field>
        <Field label="Descripción" htmlFor="nt-desc">
          <Textarea id="nt-desc" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué pasa, desde cuándo y qué se probó" />
        </Field>
        <div className="form-row">
          <Field label="Categoría" htmlFor="nt-cat">
            <Select id="nt-cat" options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} />
          </Field>
          <Field label="Prioridad" htmlFor="nt-prio">
            <Select id="nt-prio" options={priorityOptions} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} />
          </Field>
        </div>
        {create.error && <Banner tone="error">{errorMessage(create.error)}</Banner>}
        <div className="actions">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={create.isPending || !title.trim() || !description.trim()}>
            {create.isPending ? 'Creando…' : 'Crear ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
