import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
function Svg({ size = 18, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{children}</svg>
  )
}

export const IconUsers = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14c1.8.6 3 2.2 3 5" /></Svg>
export const IconUserCheck = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4" /><path d="m16.5 9.5 1.8 1.8 3.2-3.6" /></Svg>
export const IconShuffle = (p: P) => <Svg {...p}><path d="M4 7h3c3 0 4 10 8 10h5M4 17h3c1.4 0 2.3-1.5 3.1-3M20 7h-5c-1.6 0-2.7 1.2-3.6 2.6" /><path d="m18 5 2 2-2 2M18 15l2 2-2 2" /></Svg>
export const IconNote = (p: P) => <Svg {...p}><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4M8 9h8M8 13h4" /></Svg>
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
export const IconQueue = (p: P) => <Svg {...p}><path d="M4 6h16M4 12h10M4 18h6" /></Svg>
export const IconPhone = (p: P) => <Svg {...p}><path d="M6 4h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2L15 12.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z" /></Svg>
