export interface EmitOptions {
  /** One-shot components collapse into a "respondido" row showing this text. */
  answer?: string
  /** Metric-only interaction (e.g. opening a report): it does not mark the chat as waiting. */
  metric?: boolean
}

/** What a generative component can reach. Outside the chat (Diagnóstico) `interactive` is false. */
export interface GenUiEnv {
  emit: (action: string, payload?: Record<string, unknown>, opts?: EmitOptions) => boolean
  sessionId: string | null
  interactive: boolean
}

export interface GenUiComponentProps<P> {
  id: string
  props: P
  env: GenUiEnv
}

export const READONLY_ENV = (sessionId: string | null): GenUiEnv => ({ emit: () => false, sessionId, interactive: false })
