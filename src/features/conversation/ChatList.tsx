import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/api'
import { deleteSession, updateSession, type ChatSession } from '../../shared/api/sessions'
import { Button, IconClose, IconPlus, Modal } from '../../shared/ui'
import { IconArchive, IconPencil, IconTrash } from './glyphs'

export const UNTITLED = 'Nuevo chat'

type Group = { label: string; items: ChatSession[] }

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

/** Hoy / Ayer / Anteriores by last activity (local time). */
export function groupByRecency(sessions: ChatSession[], now = new Date()): Group[] {
  const today = dayKey(now)
  const y = new Date(now); y.setDate(now.getDate() - 1)
  const yesterday = dayKey(y)
  const groups: Group[] = [{ label: 'Hoy', items: [] }, { label: 'Ayer', items: [] }, { label: 'Anteriores', items: [] }]
  for (const s of sessions) {
    const t = new Date(s.updated_at || s.started_at)
    const k = Number.isNaN(t.getTime()) ? '' : dayKey(t)
    groups[k === today ? 0 : k === yesterday ? 1 : 2].items.push(s)
  }
  return groups.filter((g) => g.items.length > 0)
}

const timeFmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
function stamp(iso: string, group: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return group === 'Anteriores' ? dateFmt.format(d) : timeFmt.format(d)
}

export function ChatList({ sessions, loading, error, onRetry, activeId, onSelect, onNew, creating, onRemoved, narrow, open, onClose, unread }: {
  sessions: ChatSession[]
  loading: boolean
  error: unknown
  onRetry: () => void
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  creating: boolean
  /** Called after the chat was archived or deleted (so the view can move away from it). */
  onRemoved: (id: string) => void
  narrow: boolean
  open: boolean
  onClose: () => void
  /** Chats with undelivered notifications (best effort). */
  unread?: ReadonlySet<string>
}) {
  const qc = useQueryClient()
  const asideRef = useRef<HTMLElement>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ChatSession | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  const done = () => qc.invalidateQueries({ queryKey: ['sessions'] })
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateSession(id, { title }),
    onMutate: ({ id, title }) => {
      qc.setQueryData<ChatSession[]>(['sessions'], (old) => old?.map((s) => (s.id === id ? { ...s, title } : s)))
    },
    onError: (e) => setOpError(`No se pudo renombrar: ${errorMessage(e)}`),
    onSettled: done,
  })
  const archive = useMutation({
    mutationFn: (id: string) => updateSession(id, { archived: true }),
    onSuccess: (_r, id) => onRemoved(id),
    onError: (e) => setOpError(`No se pudo archivar: ${errorMessage(e)}`),
    onSettled: done,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: (_r, id) => { setConfirm(null); onRemoved(id) },
    onError: (e) => { setConfirm(null); setOpError(`No se pudo eliminar: ${errorMessage(e)}`) },
    onSettled: done,
  })

  // Drawer mode: move focus in when opened.
  useEffect(() => {
    if (narrow && open) asideRef.current?.querySelector<HTMLElement>('.chats-new')?.focus()
  }, [narrow, open])

  const groups = groupByRecency(sessions)
  const hidden = narrow && !open

  return (
    <>
      {narrow && open && <div className="chats-scrim" onPointerDown={onClose} aria-hidden="true" />}
      <aside
        ref={asideRef}
        className="chats"
        data-open={narrow && open ? '' : undefined}
        aria-label="Chats"
        inert={hidden}
        role={narrow ? 'dialog' : undefined}
        aria-modal={narrow && open ? true : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && narrow && open && !editing) { e.stopPropagation(); onClose() }
        }}
      >
        <div className="chats-top">
          <button type="button" className="chats-new" onClick={onNew} disabled={creating}>
            <IconPlus size={16} />{creating ? 'Creando…' : 'Nuevo chat'}
          </button>
          {narrow && (
            <button type="button" className="cmp-btn cmp-ghost" aria-label="Cerrar lista de chats" onClick={onClose}>
              <IconClose size={17} />
            </button>
          )}
        </div>

        {opError && (
          <p className="chats-err" role="alert">
            {opError}
            <button type="button" className="chats-err-x" aria-label="Descartar" onClick={() => setOpError(null)}><IconClose size={12} /></button>
          </p>
        )}

        <nav className="chats-scroll" aria-label="Historial de chats">
          {loading && sessions.length === 0 && <p className="chats-note">Cargando chats…</p>}
          {!loading && error != null && sessions.length === 0 && (
            <p className="chats-note">
              No se pudo cargar la lista. <button type="button" className="chats-link" onClick={onRetry}>Reintentar</button>
            </p>
          )}
          {!loading && error == null && sessions.length === 0 && <p className="chats-note">Todavía no hay chats.</p>}

          {groups.map((g) => (
            <section key={g.label} className="chats-group">
              <h3 className="chats-h">{g.label}</h3>
              <ul>
                {g.items.map((s) => (
                  <ChatItem
                    key={s.id}
                    s={s}
                    group={g.label}
                    active={s.id === activeId}
                    unread={!!unread?.has(s.id) && s.id !== activeId}
                    editing={editing === s.id}
                    onSelect={() => onSelect(s.id)}
                    onEdit={() => setEditing(s.id)}
                    onCommit={(title) => {
                      setEditing(null)
                      if (title !== null && title !== (s.title ?? '')) rename.mutate({ id: s.id, title })
                    }}
                    onArchive={() => archive.mutate(s.id)}
                    onDelete={() => setConfirm(s)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      {confirm && (
        <Modal title="Eliminar chat" onClose={() => setConfirm(null)}>
          <p className="confirm-text">
            Se va a eliminar <strong>{confirm.title ?? UNTITLED}</strong> con todos sus mensajes. Esta acción no se puede deshacer.
          </p>
          <div className="actions">
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => remove.mutate(confirm.id)} disabled={remove.isPending}>
              {remove.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function ChatItem({ s, group, active, unread, editing, onSelect, onEdit, onCommit, onArchive, onDelete }: {
  s: ChatSession; group: string; active: boolean; unread: boolean; editing: boolean
  onSelect: () => void; onEdit: () => void; onCommit: (title: string | null) => void
  onArchive: () => void; onDelete: () => void
}) {
  const title = s.title ?? UNTITLED
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  if (editing) {
    return (
      <li className="ci is-editing" data-active={active || undefined}>
        <input
          ref={inputRef}
          className="ci-input"
          defaultValue={s.title ?? ''}
          placeholder={UNTITLED}
          aria-label="Nombre del chat"
          maxLength={120}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(e.currentTarget.value.trim() || null) }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCommit(null) }
          }}
          onBlur={(e) => onCommit(e.currentTarget.value.trim() || null)}
        />
      </li>
    )
  }

  return (
    <li className="ci" data-active={active || undefined}>
      <button
        type="button"
        className="ci-main"
        aria-current={active ? 'page' : undefined}
        onClick={onSelect}
        onDoubleClick={onEdit}
        title={title}
      >
        <span className={`ci-title${s.title ? '' : ' is-untitled'}`}>{title}</span>
        {unread && <span className="ci-unread" role="img" aria-label="Mensaje nuevo del agente" />}
        <span className="ci-time">{stamp(s.updated_at || s.started_at, group)}</span>
      </button>
      <span className="ci-tools">
        <button type="button" className="ci-tool" aria-label={`Renombrar «${title}»`} title="Renombrar" onClick={onEdit}><IconPencil size={14} /></button>
        <button type="button" className="ci-tool" aria-label={`Archivar «${title}»`} title="Archivar" onClick={onArchive}><IconArchive size={14} /></button>
        <button type="button" className="ci-tool ci-del" aria-label={`Eliminar «${title}»`} title="Eliminar" onClick={onDelete}><IconTrash size={14} /></button>
      </span>
    </li>
  )
}
