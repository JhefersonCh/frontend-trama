import type { SelectHTMLAttributes } from 'react'

export type Option = { value: string; label: string }

export function Select({ options, className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { options: Option[] }) {
  return (
    <select className={`control ${className}`} {...rest}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
