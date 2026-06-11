import React, { useMemo, useState } from 'react'
import { triValue } from '../overlap'
import { overlapColor } from './bits'

const MAX_GRID = 60

function shortName(name) {
  return name
    .replace(/Direct Plan|Direct|Growth|Fund|Plan|-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function HeatmapView({ funds, overlaps, openPair }) {
  const catKeys = Object.keys(overlaps.categories).sort((a, b) =>
    overlaps.categories[a].name.localeCompare(overlaps.categories[b].name))
  const [catKey, setCatKey] = useState(
    catKeys.find((k) => k.includes('flexi-cap')) || catKeys[0])

  const fundById = useMemo(
    () => Object.fromEntries(funds.map((f) => [f.id, f])), [funds])

  const cat = overlaps.categories[catKey]
  const view = useMemo(() => {
    if (!cat) return null
    let ids = cat.funds
    let truncated = false
    if (ids.length > MAX_GRID) {
      const byAum = [...ids].sort(
        (a, b) => (fundById[b]?.aum || 0) - (fundById[a]?.aum || 0))
      const keep = new Set(byAum.slice(0, MAX_GRID))
      ids = ids.filter((id) => keep.has(id))
      truncated = true
    }
    const posInCat = Object.fromEntries(cat.funds.map((id, i) => [id, i]))
    const value = (a, b) => triValue(cat.m, posInCat[a], posInCat[b])
    return { ids, value, truncated }
  }, [cat, fundById])

  return (
    <div className="stack">
      <div className="card">
        <h3>Category heatmap</h3>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <select className="sel" value={catKey} onChange={(e) => setCatKey(e.target.value)}>
            {catKeys.map((k) => (
              <option key={k} value={k}>
                {overlaps.categories[k].name} ({overlaps.categories[k].funds.length})
              </option>
            ))}
          </select>
          <div className="legend">
            <span>0%</span>
            {[5, 25, 45, 60, 75, 90].map((v) => (
              <span key={v} className="sw" style={{ background: overlapColor(v) }} />
            ))}
            <span>100%</span>
          </div>
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          Each cell is the portfolio overlap between two funds. Click a cell to
          open the detailed comparison.
          {view?.truncated && ` Showing the ${MAX_GRID} largest funds by AUM.`}
        </div>
      </div>

      {view && (
        <div className="heatmap">
          <table className="hm-table">
            <thead>
              <tr>
                <th className="rowh corner" />
                {view.ids.map((id) => (
                  <th key={id} title={fundById[id]?.name}>
                    <span className="vert">{shortName(fundById[id]?.name || id)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.ids.map((rowId) => (
                <tr key={rowId}>
                  <th className="rowh" title={fundById[rowId]?.name}>
                    {shortName(fundById[rowId]?.name || rowId)}
                  </th>
                  {view.ids.map((colId) => {
                    const v = rowId === colId ? 100 : view.value(rowId, colId)
                    return (
                      <td key={colId} className="hm-cell"
                        style={{ background: rowId === colId ? 'var(--surface-2)' : overlapColor(v) }}
                        title={`${fundById[rowId]?.name}\n× ${fundById[colId]?.name}\nOverlap: ${v?.toFixed(1)}%`}
                        onClick={() => rowId !== colId && openPair(rowId, colId)}>
                        {rowId === colId ? '' : Math.round(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
