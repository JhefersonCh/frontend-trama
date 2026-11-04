import type { SVGProps } from 'react'

/** Inline stroke icons (24px grid, currentColor). Decorative by default. */
type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconWave = (p: P) => <Svg {...p}><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0" /></Svg>
export const IconPulse = (p: P) => <Svg {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></Svg>
export const IconTicket = (p: P) => <Svg {...p}><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M14 7v10" strokeDasharray="1.5 2" /></Svg>
export const IconGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
)
export const IconSliders = (p: P) => <Svg {...p}><path d="M5 4v16M12 4v16M19 4v16" /><rect x="3" y="13" width="4" height="3" rx=".5" /><rect x="10" y="7" width="4" height="3" rx=".5" /><rect x="17" y="15" width="4" height="3" rx=".5" /></Svg>
export const IconLayers = (p: P) => <Svg {...p}><path d="M12 4 3 8.5l9 4.5 9-4.5z" /><path d="m3 12.5 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></Svg>
export const IconBars = (p: P) => <Svg {...p}><path d="M4 20h16" /><rect x="6" y="11" width="3" height="6" /><rect x="11" y="6" width="3" height="11" /><rect x="16" y="13" width="3" height="4" /></Svg>
export const IconMic = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" /></Svg>
export const IconSend = (p: P) => <Svg {...p}><path d="M4 12 20 4l-5 16-3-7z" /><path d="m12 13 8-9" /></Svg>
export const IconLock = (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><path d="M12 15v1.5" /></Svg>
export const IconSun = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></Svg>
export const IconMoon = (p: P) => <Svg {...p}><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" /></Svg>
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.1" /></Svg>
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.1" /></Svg>
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>

/** Brand glyph: a 3x3 woven frame (over/under strands) with a signal node. */
export function TramaMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="25" height="25" rx="2.5" stroke="currentColor" strokeOpacity=".35" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 9h3.5M10.5 9h7M20.5 9H24" />
        <path d="M4 14h8.5M15.5 14H24" />
        <path d="M4 19h3.5M10.5 19h7M20.5 19H24" />
        <path d="M9 4v8.5M9 15.5V24" />
        <path d="M14 4v3.5M14 10.5v7M14 20.5V24" />
        <path d="M19 4v8.5M19 15.5V24" />
      </g>
      <circle cx="14" cy="14" r="2.2" fill="var(--accent)" />
    </svg>
  )
}
