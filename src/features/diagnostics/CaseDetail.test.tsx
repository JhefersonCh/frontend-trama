import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { CaseDetail } from '../../shared/api/diagnostics'
import { CaseDetailView } from './CaseDetail'

const d: CaseDetail = {
  session: { id: 's1', title: 'DNS en sala 2', started_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-01T10:05:00Z' },
  status: 'escalado', audience: 'estudiante',
  case_state: { facts: [{ key: 'site', label: 'Sede', value: 'Sala 2' }, { key: 'os', label: 'Sistema', value: null }], steps_tried: ['Reiniciar router'], ips: ['10.0.0.5'], devices: null },
  observations: [
    { observation_type: 'ping', target: '8.8.8.8', result: '38', unit: 'ms', source: 'user_provided', collected_at: '2026-01-01T10:01:00Z' },
    { observation_type: 'dns', target: 'itp.edu', result: 'timeout', unit: null, source: 'server_view', collected_at: '2026-01-01T10:02:00Z' },
  ],
  sources_used: [{ title: 'Guía DNS', section: null, is_synthetic: true, times: 2, best_score: 0.81 }],
  tools: [], tickets: [{ ticket_number: 'TRM-000001', status: 'open', priority: 'high', title: 'DNS' }], timeline: [],
}

describe('case detail', () => {
  it('renders facts, pending facts, source badges and synthetic tag', () => {
    render(<MemoryRouter><CaseDetailView d={d} /></MemoryRouter>)
    expect(screen.getByText('Sala 2')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Aportado por el usuario')).toBeInTheDocument()
    expect(screen.getByText('Vista del servidor')).toBeInTheDocument()
    expect(screen.getByText('Sintético')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir conversación/ })).toHaveAttribute('href', '/conversacion/s1')
  })
})
