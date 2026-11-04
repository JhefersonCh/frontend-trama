import { slaInfo } from './sla'

describe('slaInfo traffic light', () => {
  const start = '2026-01-01T00:00:00Z'
  const due = '2026-01-01T10:00:00Z'
  const at = (h: number) => Date.parse('2026-01-01T00:00:00Z') + h * 3600000
  it('is ok early, warn at 80 %, late after due', () => {
    expect(slaInfo(due, start, at(2))?.level).toBe('ok')
    expect(slaInfo(due, start, at(8.5))?.level).toBe('warn')
    expect(slaInfo(due, start, at(11))).toMatchObject({ level: 'late', label: 'Vencido hace 1 h' })
    expect(slaInfo(null, start, at(1))).toBeNull()
  })
})
