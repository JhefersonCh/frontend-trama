import type { ReactNode, SVGProps } from 'react'

/** Conversation-only stroke icons (same 24px grid and weight as shared/ui/icons). */
type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}
    >
      {children}
    </svg>
  )
}

export const IconArrowUp = (p: P) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
export const IconArrowDown = (p: P) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>
export const IconStop = (p: P) => <Svg {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" /></Svg>
export const IconKeyboard = (p: P) => <Svg {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M8 14h8" /></Svg>
export const IconMore = (p: P) => <Svg {...p}><path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth={2.6} /></Svg>
export const IconPencil = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>
export const IconArchive = (p: P) => <Svg {...p}><rect x="3" y="4.5" width="18" height="4.5" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></Svg>
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Svg>
export const IconChats = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M5.5 8h1M5.5 11h1" /></Svg>
export const IconCompose = (p: P) => <Svg {...p}><path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /><path d="M18.5 3.5 21 6l-8 8h-2.5v-2.5z" /></Svg>
export const IconPaperclip = (p: P) => <Svg {...p}><path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.4 3.4 0 0 1 4.8 4.8l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" /></Svg>
export const IconImage = (p: P) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17.5 5-4.5 4 3.5 2.5-2 4.5 3.5" /></Svg>
export const IconAudioFile = (p: P) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9.5 12v4M12 10.5v7M14.5 13v2" /></Svg>
