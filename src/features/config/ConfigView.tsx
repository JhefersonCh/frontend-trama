import { useState } from 'react'
import { PageHeader, Tabs } from '../../shared/ui'
import { AuditPanel } from './audit/AuditPanel'
import { ModelsPanel } from './models/ModelsPanel'
import { RamBudgetMeter } from './models/RamBudgetMeter'
import { RulesPanel } from './rules/RulesPanel'
import { ProvidersPanel } from './providers/ProvidersPanel'
import { RuntimePanel } from './runtime/RuntimePanel'
import { SettingsPanel } from './settings/SettingsPanel'
import { ToolsPanel } from './tools/ToolsPanel'

type TabKey = 'providers' | 'models' | 'runtime' | 'settings' | 'rules' | 'tools' | 'audit'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'providers', label: 'Proveedores' },
  { key: 'models', label: 'Modelos' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'settings', label: 'Parámetros' },
  { key: 'rules', label: 'Reglas' },
  { key: 'tools', label: 'Herramientas' },
  { key: 'audit', label: 'Auditoría' },
]

export function ConfigView() {
  const [tab, setTab] = useState<TabKey>('providers')
  return (
    <div className="view reveal">
      <PageHeader kicker="Panel de control" title="Configuración">
        Proveedores, perfiles de modelo y parámetros del agente. Todo se guarda en la base de datos y queda auditado.
      </PageHeader>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div className="tab-panel" role="tabpanel">
        {tab === 'providers' && <ProvidersPanel />}
        {tab === 'models' && <ModelsPanel meter={<RamBudgetMeter />} />}
        {tab === 'runtime' && <RuntimePanel />}
        {tab === 'settings' && <SettingsPanel />}
        {tab === 'rules' && <RulesPanel />}
        {tab === 'tools' && <ToolsPanel />}
        {tab === 'audit' && <AuditPanel />}
      </div>
    </div>
  )
}
