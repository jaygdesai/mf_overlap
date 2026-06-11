import React, { useMemo, useState } from 'react'
import { fmtPct, overlapColor } from './bits'

export default function TopPairsView({ funds, overlaps, openCompare }) {
  const fundById = useMemo(
    () => Object.fromEntries(funds.map((f) => [f.id, f])), [funds])

  const catKeys = useMemo(() => {
    const keys = new Set(overlaps.top.map((p) => p.cat))
    return [...keys].sort((a, b) =>
      (overlaps.categories[a]?.name || a).localeCompare(overlaps.categories[b]?.name || b))
  }, [overlaps])

  const [filter, setFilter] = useState('all')
  const [hideIndex, setHideIndex] = useState(true)

  const rows = useMemo(() => {
    let list = overlaps.top
    if (filter !== 'all') list = list.filter((p) => p.cat === filter)
    if (hideIndex) {
      list = list.filter((p) => {
        const sub = (fundById[p.a]?.sub || '').toLowerCase()
        return !sub.includes('index') && !sub.includes('etf')
      })
    }
    return list.slice(0, 100)
  }, [overlaps, filter, hideIndex, fundById])

  return (
    <div className="stack">
      <div className="card">
        <h3>Most overlapping fund pairs today</h3>
        <div className="row">
          <select className="sel" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All categories</option>
            {catKeys.map((k) => (
              <option key={k} value={k}>{overlaps.categories[k]?.name || k}</option>
            ))}
          </select>
          <label className="row small muted" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideIndex}
              onChange={(e) => setHideIndex(e.target.checked)} />
            Hide index funds &amp; ETFs (near-identical by design)
          </label>
        </div>
      </div>

      <div className="card scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Fund pair</th><th>Category</th>
              <th className="num">Overlap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={`${p.a}|${p.b}`} className="click"
                onClick={() => openCompare(p.a, p.b)}>
                <td className="muted">{i + 1}</td>
                <td>
                  <div>{fundById[p.a]?.name || p.a}</div>
                  <div className="sector">× {fundById[p.b]?.name || p.b}</div>
                </td>
                <td><span className="badge violet">
                  {overlaps.categories[p.cat]?.name || p.cat}</span></td>
                <td className="num">
                  <b style={{ color: overlapColor(Math.min(p.v, 92)), filter: 'brightness(1.6)' }}>
                    {fmtPct(p.v)}
                  </b>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="4" className="muted center" style={{ padding: 24 }}>
                No pairs match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
