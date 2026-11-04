import type { ReactNode, SVGProps } from 'react'

/** Generative-UI glyphs on the shared 24px stroke grid. */
type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}
    >
      {children}
    </svg>
  )
}

export const GlyphCloud = (p: P) => <Svg {...p}><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z" /></Svg>
export const GlyphModem = (p: P) => <Svg {...p}><rect x="3" y="11" width="18" height="7" rx="1.6" /><path d="M7 14.5h.01M10 14.5h.01M13 14.5h.01M8 18v2M16 18v2" /><path d="M9 7.5a4.5 4.5 0 0 1 6 0M10.8 9.3a1.8 1.8 0 0 1 2.4 0" /></Svg>
export const GlyphRouter = (p: P) => <Svg {...p}><rect x="3" y="12" width="18" height="6.5" rx="1.6" /><path d="M7 12 5.5 5M17 12l1.5-7M7.5 15.2h.01M10.5 15.2h.01M15 15.2h3" /></Svg>
export const GlyphPhone = (p: P) => <Svg {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 17.5h2" /></Svg>
export const GlyphPc = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M9 20h6M12 16v4" /></Svg>
export const GlyphQuestion = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.1" /></Svg>
export const GlyphAnswer = (p: P) => <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 10.5h7" /></Svg>
export const GlyphRule = (p: P) => <Svg {...p}><path d="M8 4H5v16h3M16 4h3v16h-3M9 12h6" /></Svg>
export const GlyphTarget = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></Svg>
export const GlyphBolt = (p: P) => <Svg {...p}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></Svg>
export const GlyphStep = (p: P) => <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12.3 2.4 2.4 4.6-5" /></Svg>
export const GlyphFact = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></Svg>
export const GlyphNote = (p: P) => <Svg {...p}><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4M8.5 12.5h7M8.5 16h5" /></Svg>
export const GlyphBell = (p: P) => <Svg {...p}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Svg>
export const GlyphChip = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></Svg>
export const GlyphTicket = (p: P) => <Svg {...p}><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M14 7v10" strokeDasharray="1.5 2" /></Svg>
export const GlyphDoc = (p: P) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h2" /></Svg>
export const GlyphDownload = (p: P) => <Svg {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Svg>
export const GlyphExternal = (p: P) => <Svg {...p}><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v6H4V6h6" /></Svg>
export const GlyphCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
export const GlyphCross = (p: P) => <Svg {...p}><path d="M7 7l10 10M17 7 7 17" /></Svg>
export const GlyphPlus = (p: P) => <Svg {...p}><path d="M12 6v12M6 12h12" /></Svg>
export const GlyphMinus = (p: P) => <Svg {...p}><path d="M6 12h12" /></Svg>
export const GlyphMove = (p: P) => <Svg {...p}><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></Svg>
export const GlyphRetry = (p: P) => <Svg {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" /><path d="M4.5 4.5V9H9" /></Svg>
