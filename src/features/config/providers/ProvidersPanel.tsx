import { useState } from 'react'
import { Banner, Button, IconPlus, Loading, Modal, SectionHead } from '../../../shared/ui'
import { errorMessage, type Provider } from '../../../shared/api'
import { ProviderForm } from './ProviderForm'
import { ProvidersTable } from './ProvidersTable'
import { SecretForm } from './SecretForm'
import { useProviderMutations, useProviders } from './useProviders'

type Dialog =
  | { type: 'form'; provider?: Provider }
  | { type: 'secret'; provider: Provider }
  | { type: 'delete'; provider: Provider }
  | null

export function ProvidersPanel() {
  const { data, isLoading, error } = useProviders()
  const m = useProviderMutations()
  const [dialog, setDialog] = useState<Dialog>(null)

  const close = () => {
    setDialog(null)
    m.save.reset(); m.remove.reset(); m.setSecret.reset(); m.removeSecret.reset()
  }

  // Keep the secret dialog in sync with refetched has_secret.
  const liveSecretProvider = dialog?.type === 'secret' ? data?.find((p) => p.id === dialog.provider.id) ?? dialog.provider : null

  return (
    <section>
      <SectionHead title="Proveedores" meta={data ? `${data.length} registrados` : undefined}>
        <Button variant="primary" onClick={() => setDialog({ type: 'form' })}><IconPlus size={16} />Nuevo proveedor</Button>
      </SectionHead>
      {isLoading && <Loading />}
      {error && <Banner tone="error">{errorMessage(error)}</Banner>}
      {data && (
        <ProvidersTable
          providers={data}
          onEdit={(provider) => setDialog({ type: 'form', provider })}
          onSecret={(provider) => setDialog({ type: 'secret', provider })}
          onDelete={(provider) => setDialog({ type: 'delete', provider })}
        />
      )}

      {dialog?.type === 'form' && (
        <Modal title={dialog.provider ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={close}>
          <ProviderForm
            initial={dialog.provider}
            pending={m.save.isPending}
            error={m.save.error ? errorMessage(m.save.error) : null}
            onCancel={close}
            onSubmit={(body) => m.save.mutate({ id: dialog.provider?.id, body }, { onSuccess: close })}
          />
        </Modal>
      )}

      {dialog?.type === 'secret' && liveSecretProvider && (
        <Modal title={`Credencial de ${liveSecretProvider.name}`} onClose={close}>
          <SecretForm
            hasSecret={liveSecretProvider.has_secret}
            pending={m.setSecret.isPending || m.removeSecret.isPending}
            error={m.setSecret.error || m.removeSecret.error ? errorMessage(m.setSecret.error ?? m.removeSecret.error) : null}
            onCancel={close}
            onSave={(value) => m.setSecret.mutate({ id: dialog.provider.id, value }, { onSuccess: close })}
            onRemove={() => m.removeSecret.mutate(dialog.provider.id, { onSuccess: close })}
          />
        </Modal>
      )}

      {dialog?.type === 'delete' && (
        <Modal title="Eliminar proveedor" onClose={close}>
          <p className="confirm-text">¿Eliminar el proveedor <strong>{dialog.provider.name}</strong>? Esta acción no se puede deshacer.</p>
          {m.remove.error && <Banner tone="error">{errorMessage(m.remove.error)}</Banner>}
          <div className="actions">
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button variant="danger" disabled={m.remove.isPending} onClick={() => m.remove.mutate(dialog.provider.id, { onSuccess: close })}>
              Confirmar eliminación
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
