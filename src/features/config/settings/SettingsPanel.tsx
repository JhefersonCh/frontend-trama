import { useState } from 'react'
import { Banner, Loading, SectionHead } from '../../../shared/ui'
import { errorMessage } from '../../../shared/api'
import { SETTING_DEFS } from './definitions'
import { SettingForm } from './SettingForm'
import { JsonSettingForm, TokenLimitsForm } from './ExtraSettings'
import { usePutSetting, useSettings } from './useSettings'

const TOKENS_KEY = 'max_tokens_by_intent'

export function SettingsPanel() {
  const { data, isLoading, error } = useSettings()
  const known = new Set([...SETTING_DEFS.map((d) => d.key), TOKENS_KEY])
  const extraKeys = data ? Object.keys(data).filter((k) => !known.has(k)).sort() : []
  const put = usePutSetting()
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const save = (key: string, value: unknown) => {
    setErrors((e) => ({ ...e, [key]: null }))
    setSaved((s) => ({ ...s, [key]: false }))
    put.mutate({ key, value }, {
      onSuccess: () => setSaved((s) => ({ ...s, [key]: true })),
      onError: (err) => setErrors((e) => ({ ...e, [key]: errorMessage(err) })),
    })
  }

  return (
    <section>
      <SectionHead title="Parámetros" meta={`${SETTING_DEFS.length + 1} claves`} />
      {isLoading && <Loading />}
      {error && <Banner tone="error">{errorMessage(error)}</Banner>}
      {data && (
        <>
          <div className="settings-grid">
            {SETTING_DEFS.map((def) => (
              <SettingForm
                key={def.key}
                def={def}
                value={data[def.key]}
                pending={put.isPending && put.variables?.key === def.key}
                saved={saved[def.key]}
                error={errors[def.key]}
                onSave={(v) => save(def.key, v)}
              />
            ))}
            <TokenLimitsForm
              key={JSON.stringify(data[TOKENS_KEY] ?? null)}
              value={data[TOKENS_KEY]}
              pending={put.isPending && put.variables?.key === TOKENS_KEY}
              saved={saved[TOKENS_KEY]}
              error={errors[TOKENS_KEY]}
              onSave={(v) => save(TOKENS_KEY, v)}
            />
          </div>
          {extraKeys.length > 0 && (
            <>
              <SectionHead title="Avanzado" meta={`${extraKeys.length} claves · JSON validado por el servidor`} />
              <div className="settings-grid">
                {extraKeys.map((k) => (
                  <JsonSettingForm
                    key={`${k}:${JSON.stringify(data[k])}`}
                    settingKey={k}
                    value={data[k]}
                    pending={put.isPending && put.variables?.key === k}
                    saved={saved[k]}
                    error={errors[k]}
                    onSave={(v) => save(k, v)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
