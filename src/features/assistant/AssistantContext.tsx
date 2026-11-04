import { createContext, useContext } from 'react'

/**
 * Link between the Layout (wake word, floating assistant) and the full chat view.
 * The mic has ONE owner at a time: the chat reports whether its voice mode is on, and the Layout
 * hands the chat the wake event when the user is on the Conversación route.
 */
export interface AssistantLink {
  setChatVoiceActive: (active: boolean) => void
  setChatWakeHandler: (fn: (() => void) | null) => void
}

export const AssistantLinkContext = createContext<AssistantLink | null>(null)
export const useAssistantLink = () => useContext(AssistantLinkContext)
