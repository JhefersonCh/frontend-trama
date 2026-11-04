import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GenUiBlock } from './GenUiBlock'
import type { GenUiEnv } from './types'

describe('generative UI block', () => {
  it('falls back to text for unknown or invalid components and emits quick_reply (digit shortcut) then collapses', () => {
    const emit = vi.fn<GenUiEnv['emit']>(() => true)
    const env: GenUiEnv = { emit, sessionId: 's1', interactive: true }
    const { rerender } = render(<GenUiBlock id="c0" component="hologram" props={{}} fallbackText="Texto de respaldo" env={env} />)
    expect(screen.getByText('Texto de respaldo')).toBeInTheDocument()
    rerender(<GenUiBlock id="c0" component="quick_replies" props={{ fact: 'x', options: 'nope' }} fallbackText="Opciones: Sí / No" env={env} />)
    expect(screen.getByText('Opciones: Sí / No')).toBeInTheDocument()

    const props = { fact: 'otros_equipos', question: '¿Otros equipos tienen internet?', options: [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }], allow_free_text: false }
    rerender(<MemoryRouter><GenUiBlock id="c1" component="quick_replies" props={props} fallbackText="" env={env} /></MemoryRouter>)
    fireEvent.keyDown(screen.getByRole('button', { name: /Sí/ }), { key: '2' })
    expect(emit).toHaveBeenCalledWith('quick_reply', { fact: 'otros_equipos', value: 'no' }, { answer: 'No' })

    rerender(<MemoryRouter><GenUiBlock id="c1" component="quick_replies" props={props} fallbackText="" answer="No" env={env} /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('No')
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })
})
