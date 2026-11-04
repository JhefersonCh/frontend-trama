import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`control ${className}`} {...rest} />
}
export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`control ${className}`} {...rest} />
}
