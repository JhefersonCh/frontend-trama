import type { ReactNode } from 'react'

export type Column<T> = { header: string; render: (row: T) => ReactNode; className?: string }

export function Table<T>({ columns, rows, rowKey, empty = 'Sin datos' }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; empty?: string
}) {
  if (rows.length === 0) return <div className="empty-slot"><span className="empty-slot-led" aria-hidden="true" />{empty}</div>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr>{columns.map((c) => <th key={c.header} className={c.className}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>{columns.map((c) => <td key={c.header} className={c.className}>{c.render(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
