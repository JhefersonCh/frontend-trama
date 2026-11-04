import type { ReactNode } from 'react'
import { IconAlert, IconCheck, IconClose, IconInfo } from './icons'

const ICON = { info: IconInfo, warning: IconAlert, error: IconAlert, success: IconCheck }

export function Banner({ tone = 'info', onClose, children }: {
  tone?: 'info' | 'warning' | 'error' | 'success'; onClose?: () => void; children: ReactNode
}) {
  const Icon = ICON[tone]
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="banner-icon" />
      <div className="banner-body">{children}</div>
      {onClose && (
        <button type="button" className="icon-btn banner-close" aria-label="Cerrar" onClick={onClose}>
          <IconClose size={16} />
        </button>
      )}
    </div>
  )
}
