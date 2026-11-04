import { Component as ReactComponent, useMemo, type ReactNode } from 'react'
import { RichText } from '../conversation/rich'
import { GlyphCheck } from './icons'
import { REGISTRY } from './registry'
import type { GenUiEnv } from './types'
import './genui.css'

class Boundary extends ReactComponent<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function Fallback({ text }: { text: string }) {
  return (
    <div className="gu-fallback">
      {text ? <p className="answer"><RichText text={text} /></p> : <p className="gu-fallback-empty">Contenido no disponible.</p>}
    </div>
  )
}

/**
 * Render one `ui_component` from the closed catalog. Unknown name, invalid props or a render
 * error all degrade to `fallback_text`. One-shot components collapse once `answer` is set.
 */
export function GenUiBlock({ id, component, props, fallbackText, answer, env }: {
  id: string
  component: string
  props: unknown
  fallbackText: string
  answer?: string | null
  env: GenUiEnv
}) {
  const def = REGISTRY[component]
  const parsed = useMemo(() => (def ? def.parse(props) : null), [def, props])
  if (!def || parsed === null) return <Fallback text={fallbackText} />

  if (answer && def.oneShot) {
    return (
      <div className="gu-done" role="status">
        <span className="gu-done-icon" aria-hidden="true"><GlyphCheck size={12} /></span>
        <span className="gu-done-k">{def.title}</span>
        <span className="gu-done-v">{answer}</span>
      </div>
    )
  }

  const C = def.Component
  return (
    <Boundary fallback={<Fallback text={fallbackText} />}>
      <C id={id} props={parsed} env={env} />
    </Boundary>
  )
}
