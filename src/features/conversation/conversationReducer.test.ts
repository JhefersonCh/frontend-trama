import type { ServerMessage } from '../../shared/api/ws'
import { conversationReducer, initialConversation, type ConversationState } from './conversationReducer'

const run = (state: ConversationState, ...msgs: ServerMessage[]) =>
  msgs.reduce((s, msg) => conversationReducer(s, { type: 'server', msg }), state)

describe('conversationReducer', () => {
  it('streams tokens into one assistant entry and closes it on interrupted turn_end', () => {
    let s = conversationReducer(initialConversation(), { type: 'user_text', turnId: 't1', text: 'No tengo DHCP' })
    s = run(s,
      { type: 'state', turn_id: 't1', state: 'thinking' },
      { type: 'token', turn_id: 't1', text: 'Revise ' },
      { type: 'token', turn_id: 't1', text: 'el cable' },
    )
    const streaming = s.entries.filter((e) => e.kind === 'assistant')
    expect(streaming).toHaveLength(1)
    expect(streaming[0]).toMatchObject({ text: 'Revise el cable', streaming: true, interrupted: false })
    expect(s.activeTurn).toBe('t1')

    s = run(s, { type: 'turn_end', turn_id: 't1', interrupted: true, metrics: { total_ms: 900 } })
    const [done] = s.entries.filter((e) => e.kind === 'assistant')
    expect(done).toMatchObject({ text: 'Revise el cable', streaming: false, interrupted: true, metrics: { total_ms: 900 } })
    expect(s.activeTurn).toBeNull()
    expect(s.serverState).toBe('idle')
  })

  it('handles agent frames: progress clears on token, confirm closes on next user turn, notifications dedupe', () => {
    let s = run(initialConversation(),
      { type: 'progress', turn_id: 't1', message: 'Revisando su caso…' },
      { type: 'confirm_request', turn_id: 't1', action: 'create_ticket', summary: '¿Registro el caso?' },
      { type: 'notification', id: 'n1', kind: 'followup', text: '¿Se resolvió?' },
      { type: 'notification', id: 'n1', kind: 'followup', text: '¿Se resolvió?' },
      { type: 'case_update', state: 'diagnosticando', top_hypotheses: [{ key: 'h1', label: 'DNS', cf: 0.6 }] },
    )
    expect(s.progress).toBe('Revisando su caso…')
    expect(s.entries.filter((e) => e.kind === 'assistant')).toHaveLength(1)
    expect(s.caseView?.hypotheses[0].key).toBe('h1')
    s = run(s, { type: 'token', turn_id: 't1', text: 'Hola' })
    expect(s.progress).toBeNull()
    s = conversationReducer(s, { type: 'user_text', turnId: 't2', text: 'sí' })
    expect(s.entries.find((e) => e.kind === 'confirm')).toMatchObject({ answer: 'other' })
  })

  it('appends ui_component, replaces it by id, collapses answered one-shots and restores ui history rows', () => {
    const qr = { type: 'ui_component', turn_id: 't1', id: 'cmp_a', component: 'quick_replies', props: { fact: 'f', options: [] }, fallback_text: 'Sí/No' } as const
    let s = run(initialConversation(), qr, { type: 'ui_component', turn_id: 't1', id: 'cmp_b', component: 'checklist', props: { v: 1 } })
    s = run(s, { type: 'ui_component', turn_id: 't1', id: 'cmp_b', component: 'checklist', props: { v: 2 } })
    const ui = s.entries.filter((e) => e.kind === 'ui')
    expect(ui).toHaveLength(2)
    expect(ui[1]).toMatchObject({ componentId: 'cmp_b', props: { v: 2 } })

    s = conversationReducer(s, { type: 'ui_sent', entryId: ui[0].id, turnId: 't2', answer: 'No' })
    expect(s.entries[0]).toMatchObject({ answer: 'No' })
    expect(s.activeTurn).toBe('t2')

    const h = conversationReducer(initialConversation(), { type: 'history', messages: [
      { role: 'ui', id: 'cmp_q', component: 'quick_replies', props: {}, fallback_text: '' },
      { role: 'user', text: 'no' },
      { role: 'ui', id: 'cmp_q2', component: 'quick_replies', props: {}, fallback_text: '' },
    ] })
    expect(h.entries.map((e) => (e.kind === 'ui' ? e.answer : e.kind))).toEqual(['Respondido', 'user', null])
  })
})
