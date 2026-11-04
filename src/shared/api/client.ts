export const API_BASE = '/api'

export type ValidationItem = { loc?: (string | number)[]; msg: string; type?: string }
export type ErrorDetail = string | ValidationItem[]

export class ApiError extends Error {
  readonly status: number
  readonly detail: ErrorDetail

  constructor(status: number, detail: ErrorDetail) {
    super(formatDetail(detail))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function formatDetail(detail: ErrorDetail): string {
  if (typeof detail === 'string') return detail
  return detail.map((d) => d.msg).join('; ')
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Error desconocido'
}

export async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  if (!res.ok) {
    let detail: ErrorDetail = res.statusText || `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body && body.detail !== undefined) detail = body.detail
    } catch {
      /* body not JSON */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
