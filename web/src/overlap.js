// Overlap math shared conventions with pipeline/compute_overlaps.py.
//
// A holdings entry is [key, name, sector, nature, pct].

export function weightsOf(holdingEntry) {
  const w = new Map()
  for (const [key, , , , pct] of holdingEntry.h) {
    w.set(key, (w.get(key) || 0) + pct)
  }
  return w
}

// Overlap % = sum of min(weight A, weight B) over common instruments.
export function overlapPct(wa, wb) {
  if (wb.size < wa.size) [wa, wb] = [wb, wa]
  let total = 0
  for (const [key, a] of wa) {
    const b = wb.get(key)
    if (b !== undefined) total += Math.min(a, b)
  }
  return total
}

// Detailed pairwise comparison for the Compare view.
export function compareFunds(entryA, entryB) {
  const byKey = new Map()
  for (const [key, name, sector, nature, pct] of entryA.h) {
    const row = byKey.get(key) || { key, name, sector, nature, a: 0, b: 0 }
    row.a += pct
    byKey.set(key, row)
  }
  for (const [key, name, sector, nature, pct] of entryB.h) {
    const row = byKey.get(key) || { key, name, sector, nature, a: 0, b: 0 }
    row.b += pct
    byKey.set(key, row)
  }
  const common = []
  const onlyA = []
  const onlyB = []
  let overlap = 0
  for (const row of byKey.values()) {
    if (row.a > 0 && row.b > 0) {
      row.min = Math.min(row.a, row.b)
      overlap += row.min
      common.push(row)
    } else if (row.a > 0) onlyA.push(row)
    else onlyB.push(row)
  }
  common.sort((x, y) => y.min - x.min)
  onlyA.sort((x, y) => y.a - x.a)
  onlyB.sort((x, y) => y.b - x.b)
  return { overlap, common, onlyA, onlyB }
}

// Triangle convention: for positions i < j, index = j*(j-1)/2 + i.
export function triValue(tri, i, j) {
  if (i === j) return 100
  const [lo, hi] = i < j ? [i, j] : [j, i]
  return tri[(hi * (hi - 1)) / 2 + lo]
}

// Extract the per-day series for a pair of fund ids from a history file.
export function pairSeries(history, idA, idB) {
  const pa = history.funds.indexOf(idA)
  const pb = history.funds.indexOf(idB)
  if (pa === -1 || pb === -1) return []
  const out = []
  for (const day of history.days) {
    const i = day.idx.indexOf(pa)
    const j = day.idx.indexOf(pb)
    if (i === -1 || j === -1) continue
    const v = triValue(day.t, i, j)
    if (v !== null && v !== undefined) out.push({ date: day.d, value: v })
  }
  return out
}
