/** Rank-based layered layout for small DAGs (≤ ~30 nodes): longest path from the roots. */
export interface Placed { id: string; rank: number; slot: number; slots: number }

export function layer<T extends { id: string }>(nodes: T[], edges: { from: string; to: string }[], fallbackRank: (n: T) => number): Placed[] {
  const rank = new Map<string, number>()
  const touched = new Set<string>()
  for (const e of edges) { touched.add(e.from); touched.add(e.to) }
  const hasIncoming = new Set(edges.map((e) => e.to))
  for (const n of nodes) {
    if (!touched.has(n.id)) rank.set(n.id, fallbackRank(n))
    else if (!hasIncoming.has(n.id)) rank.set(n.id, 0)
  }
  // Pure cycles have no root: seed them from their fallback rank.
  if (![...touched].some((id) => rank.has(id))) {
    const first = nodes.find((n) => touched.has(n.id))
    if (first) rank.set(first.id, fallbackRank(first))
  }
  for (let iter = 0; iter < nodes.length; iter++) {
    let changed = false
    for (const e of edges) {
      const r = rank.get(e.from)
      if (r === undefined) continue
      if ((rank.get(e.to) ?? -1) < r + 1) { rank.set(e.to, r + 1); changed = true }
    }
    if (!changed) break
  }
  for (const n of nodes) if (!rank.has(n.id)) rank.set(n.id, fallbackRank(n))
  // Compress to consecutive ranks.
  const used = [...new Set(rank.values())].sort((a, b) => a - b)
  const index = new Map(used.map((r, i) => [r, i]))
  const byRank = new Map<number, string[]>()
  for (const n of nodes) {
    const r = index.get(rank.get(n.id)!)!
    byRank.set(r, [...(byRank.get(r) ?? []), n.id])
  }
  const out: Placed[] = []
  for (const [r, ids] of byRank) ids.forEach((id, slot) => out.push({ id, rank: r, slot, slots: ids.length }))
  return out
}
