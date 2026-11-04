import { Button } from '../../shared/ui'
import type { ChatEntry } from './conversationReducer'

type Confirm = Extract<ChatEntry, { kind: 'confirm' }>

const RESULT = { yes: 'Confirmado', no: 'Rechazado', other: 'Respondida en la conversación' } as const

/** Inline yes/no confirmation. It never blocks the composer or the mic: "sí" by voice also works. */
export function ConfirmCard({ entry, onAnswer }: { entry: Confirm; onAnswer: (accepted: boolean) => void }) {
  const open = entry.answer === null
  return (
    <section className="confirm-card" data-answer={entry.answer ?? undefined} aria-label="Confirmación solicitada">
      <p className="confirm-eyebrow">Confirmación</p>
      <p className="confirm-summary">{entry.summary}</p>
      <div className="confirm-actions">
        <Button variant="primary" disabled={!open} onClick={() => onAnswer(true)}>Sí, registrar</Button>
        <Button variant="ghost" disabled={!open} onClick={() => onAnswer(false)}>No</Button>
        {!open && <span className="confirm-result" role="status">{RESULT[entry.answer!]}</span>}
      </div>
    </section>
  )
}
