import type { PageContext } from '../../shared/api/ws'

const ENTITY: Record<string, 'ticket' | 'case' | 'technician'> = {
  tickets: 'ticket', tecnicos: 'technician', diagnostico: 'case', conversacion: 'case',
}

/** Route (+ entity when the URL carries one) the assistant sends with each message. */
export function pageContext(pathname: string): PageContext {
  const m = /^\/(tickets|tecnicos|diagnostico|conversacion)\/([\w.-]{1,64})\/?$/.exec(pathname)
  return { route: pathname.slice(0, 200), ...(m ? { entity: { type: ENTITY[m[1]], id: m[2] } } : {}) }
}
