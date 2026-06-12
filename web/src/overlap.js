// Overlap math shared conventions with pipeline/compute_overlaps.py.
//
// A holdings entry is [key, name, sector, nature, pct].
//
// Negative-weight rows (short futures/derivative legs, as disclosed by e.g.
// arbitrage funds) are excluded, and a fund whose remaining long book exceeds
// 100% gross is rescaled to 100%, so overlap is always within 0-100.

const GROSS_TOLERANCE = 100.05

export function weightsOf(holdingEntry) {
  const w = new Map()
  let total = 0
  for (const [key, , , , pct] of holdingEntry.h) {
    if (pct <= 0) continue
    w.set(key, (w.get(key) || 0) + pct)
    total += pct
  }
  if (total > GROSS_TOLERANCE) {
    const scale = 100 / total
    for (const [key, v] of w) w.set(key, v * scale)
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
  return Math.min(total, 100)
}

// Detailed pairwise comparison for the Compare view.
export function compareFunds(entryA, entryB) {
  const byKey = new Map()
  let grossA = 0
  let grossB = 0
  for (const [key, name, sector, nature, pct] of entryA.h) {
    if (pct <= 0) continue
    grossA += pct
    const row = byKey.get(key) || { key, name, sector, nature, a: 0, b: 0 }
    row.a += pct
    byKey.set(key, row)
  }
  for (const [key, name, sector, nature, pct] of entryB.h) {
    if (pct <= 0) continue
    grossB += pct
    const row = byKey.get(key) || { key, name, sector, nature, a: 0, b: 0 }
    row.b += pct
    byKey.set(key, row)
  }
  const scaleA = grossA > GROSS_TOLERANCE ? 100 / grossA : 1
  const scaleB = grossB > GROSS_TOLERANCE ? 100 / grossB : 1

  const common = []
  const onlyA = []
  const onlyB = []
  let overlap = 0
  for (const row of byKey.values()) {
    row.a *= scaleA
    row.b *= scaleB
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
  return {
    overlap: Math.min(overlap, 100),
    common,
    onlyA,
    onlyB,
    rescaled: scaleA < 1 || scaleB < 1,
  }
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
