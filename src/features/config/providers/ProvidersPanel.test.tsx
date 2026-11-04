import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { makeQueryClient } from '../../../app/providers'
import { server } from '../../../test/server'
import type { ModelProfile, Provider } from '../../../shared/api'
import { ModelsPanel } from '../models/ModelsPanel'
import { ProvidersPanel } from './ProvidersPanel'

const ts = '2026-01-01T00:00:00Z'
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>)

describe('secret handling', () => {
  it('never renders the secret value, only the "Credencial configurada" badge', async () => {
    const provider: Provider = { id: 1, name: 'Ollama local', kind: 'ollama', base_url: 'http://ollama:11434', enabled: true, has_secret: false, created_at: ts, updated_at: ts }
    let sentValue = ''
    server.use(
      http.get('/api/providers', () => HttpResponse.json([provider])),
      http.put('/api/providers/1/secret', async ({ request }) => {
        sentValue = ((await request.json()) as { value: string }).value
        provider.has_secret = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    wrap(<ProvidersPanel />)

    await user.click(await screen.findByRole('button', { name: 'Credencial de Ollama local' }))
    await user.type(screen.getByLabelText('Nueva credencial'), 'super-secreto-123')
    await user.click(screen.getByRole('button', { name: 'Guardar credencial' }))

    const row = (await screen.findByText('Ollama local')).closest('tr')!
    expect(await within(row).findByText('Credencial configurada')).toBeInTheDocument()
    expect(sentValue).toBe('super-secreto-123')
    expect(document.body).not.toHaveTextContent('super-secreto-123')
    expect(screen.queryByDisplayValue('super-secreto-123')).toBeNull()
  })
})

describe('embedding activation', () => {
  it('shows the reindex banner when the API says reindex_required', async () => {
    const profile: ModelProfile = { id: 7, name: 'Embed B', role: 'embedding', provider_id: 1, model_ref: 'embeddinggemma', params: {}, est_memory_mb: 300, measured_memory_mb: null, is_active: false, created_at: ts, updated_at: ts }
    server.use(
      http.get('/api/providers', () => HttpResponse.json([])),
      http.get('/api/model-profiles', () => HttpResponse.json([profile])),
      http.get('/api/runtime/status', () => HttpResponse.json({ ram_budget_mb: 8000, strict_single_model: true, used_mb: 0, loaded: [], providers: [] })),
      http.post('/api/model-profiles/7/activate', () => HttpResponse.json({ profile: { ...profile, is_active: true }, reindex_required: true })),
    )
    const user = userEvent.setup()
    wrap(<ModelsPanel />)

    await user.click(await screen.findByRole('button', { name: 'Activar Embed B' }))
    expect(await screen.findByText('Cambiar el modelo de embeddings requiere reindexar el conocimiento')).toBeInTheDocument()
  })
})
