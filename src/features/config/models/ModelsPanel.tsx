import { useMemo, useState, type ReactNode } from 'react'
import { Banner, Button, IconPlus, Loading, Modal, SectionHead } from '../../../shared/ui'
import { errorMessage, type ModelProfile } from '../../../shared/api'
import { useProviders } from '../providers/useProviders'
import { loadNotices, useRuntimeActions, useRuntimeStatus } from '../runtime/useRuntime'
import type { TestResult } from '../../../shared/api/runtime'
import { ModelForm } from './ModelForm'
import { ModelGroup, type RuntimeControls } from './ModelGroup'
import { ROLES } from './roles'
import { useModelMutations, useModelProfiles } from './useModels'

type ProfileId = ModelProfile['id']
type Dialog = { type: 'form'; profile?: ModelProfile } | { type: 'delete'; profile: ModelProfile } | null

export function ModelsPanel({ meter }: { meter?: ReactNode } = {}) {
  const models = useModelProfiles()
  const providers = useProviders()
  const m = useModelMutations()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reindex, setReindex] = useState(false)
  const status = useRuntimeStatus()
  const rt = useRuntimeActions()
  const [notices, setNotices] = useState<{ tone: 'info' | 'warning'; text: string }[]>([])
  const [tests, setTests] = useState<RuntimeControls['tests']>({})
  const [busy, setBusy] = useState<RuntimeControls['busy']>(null)

  const loaded = useMemo(() => new Map((status.data?.loaded ?? []).map((l) => [String(l.profile_id), l])), [status.data])
  const run = <T,>(id: ProfileId, kind: 'load' | 'unload' | 'test', fn: () => Promise<T>, done: (r: T) => void) => {
    setBusy({ id: String(id), kind })
    setNotices([])
    return fn().then(done).catch((e) => {
      if (kind === 'test') setTests((t) => ({ ...t, [String(id)]: { error: errorMessage(e) } }))
      else setNotices([{ tone: 'warning', text: errorMessage(e) }])
    }).finally(() => setBusy(null))
  }
  const runtime: RuntimeControls | undefined = status.data ? {
    loaded, busy, tests,
    onLoad: (p) => run(p.id, 'load', () => rt.load.mutateAsync(p.id), (r) => setNotices(loadNotices(r))),
    onUnload: (p) => run(p.id, 'unload', () => rt.unload.mutateAsync(p.id), () => undefined),
    onTest: (p) => run(p.id, 'test', () => rt.test.mutateAsync(p.id), (r: TestResult) => setTests((t) => ({ ...t, [String(p.id)]: r }))),
  } : undefined

  const close = () => { setDialog(null); m.save.reset(); m.remove.reset() }
  const provs = providers.data ?? []

  const activate = (p: ModelProfile) =>
    m.activate.mutate(p.id, { onSuccess: (res) => setReindex(res.reindex_required) })

  return (
    <section>
      <SectionHead title="Modelos" meta={models.data ? `${models.data.length} perfiles · ${models.data.filter((p) => p.is_active).length} activos` : undefined}>
        <Button variant="primary" onClick={() => setDialog({ type: 'form' })}><IconPlus size={16} />Nuevo perfil</Button>
      </SectionHead>
      {reindex && (
        <Banner tone="warning" onClose={() => setReindex(false)}>
          Cambiar el modelo de embeddings requiere reindexar el conocimiento
        </Banner>
      )}
      {meter}
      {notices.map((n, i) => <Banner key={`${i}-${n.text}`} tone={n.tone} onClose={() => setNotices([])}>{n.text}</Banner>)}
      {m.activate.error && <Banner tone="error">{errorMessage(m.activate.error)}</Banner>}
      {models.isLoading && <Loading />}
      {models.error && <Banner tone="error">{errorMessage(models.error)}</Banner>}
      {models.data && ROLES.map(({ role, label, short, hint }) => (
        <ModelGroup
          key={role}
          label={label}
          short={short}
          hint={hint}
          profiles={models.data.filter((p) => p.role === role)}
          providers={provs}
          activatingId={m.activate.isPending ? m.activate.variables : null}
          onActivate={activate}
          runtime={runtime}
          onEdit={(profile) => setDialog({ type: 'form', profile })}
          onDelete={(profile) => setDialog({ type: 'delete', profile })}
        />
      ))}

      {dialog?.type === 'form' && (
        <Modal title={dialog.profile ? 'Editar perfil' : 'Nuevo perfil'} onClose={close}>
          <ModelForm
            initial={dialog.profile}
            providers={provs}
            pending={m.save.isPending}
            error={m.save.error ? errorMessage(m.save.error) : null}
            onCancel={close}
            onSubmit={(body) => m.save.mutate({ id: dialog.profile?.id, body }, { onSuccess: close })}
          />
        </Modal>
      )}
      {dialog?.type === 'delete' && (
        <Modal title="Eliminar perfil" onClose={close}>
          <p className="confirm-text">¿Eliminar el perfil <strong>{dialog.profile.name}</strong>? Esta acción no se puede deshacer.</p>
          {m.remove.error && <Banner tone="error">{errorMessage(m.remove.error)}</Banner>}
          <div className="actions">
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button variant="danger" disabled={m.remove.isPending} onClick={() => m.remove.mutate(dialog.profile.id, { onSuccess: close })}>
              Confirmar eliminación
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
