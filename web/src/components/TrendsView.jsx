import React, { useEffect, useMemo, useState } from 'react'
import { loadHistory } from '../api'
import { pairSeries } from '../overlap'
import TrendChart from './TrendChart'
import { Spinner, fmtPct } from './bits'

export default function TrendsView({ funds, overlaps, pair, setPair, openCompare }) {
  const catKeys = Object.keys(overlaps.categories).sort((a, b) =>
    overlaps.categories[a].name.localeCompare(overlaps.categories[b].name))

  const fundById = useMemo(
    () => Object.fromEntries(funds.map((f) => [f.id, f])), [funds])

  // Default to the currently compared pair when it belongs to one category.
  const initialCat = useMemo(() => {
    if (pair[0] && pair[1]) {
      const hit = catKeys.find((k) => {
        const ids = overlaps.categories[k].funds
        return ids.includes(pair[0]) && ids.includes(pair[1])
      })
      if (hit) return hit
    }
    return catKeys.find((k) => k.includes('flexi-cap')) || catKeys[0]
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [catKey, setCatKey] = useState(initialCat)
  const cat = overlaps.categories[catKey]
  const ids = cat?.funds || []

  const [idA, setIdA] = useState(ids.includes(pair[0]) ? pair[0] : ids[0])
  const [idB, setIdB] = useState(ids.includes(pair[1]) ? pair[1] : ids[1])
  const [history, setHistory] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    setHistory(null)
    setErr(null)
    loadHistory(catKey).then(setHistory).catch(setErr)
  }, [catKey])

  function changeCat(k) {
    setCatKey(k)
    const newIds = overlaps.categories[k].funds
    setIdA(newIds[0])
    setIdB(newIds[1])
  }

  const series = useMemo(() => {
    if (!history || !idA || !idB) return []
    return pairSeries(history, idA, idB)
  }, [history, idA, idB])

  const latest = series[series.length - 1]
  const first = series[0]
  const change = latest && first ? latest.value - first.value : 0

  return (
    <div className="stack">
      <div className="card">
        <h3>Overlap over time</h3>
        <div className="row">
          <select className="sel" value={catKey} onChange={(e) => changeCat(e.target.value)}>
            {catKeys.map((k) => (
              <option key={k} value={k}>{overlaps.categories[k].name}</option>
            ))}
          </select>
          <select className="sel" value={idA} onChange={(e) => setIdA(e.target.value)}
            style={{ maxWidth: 280 }}>
            {ids.map((id) => (
              <option key={id} value={id} disabled={id === idB}>{fundById[id]?.name || id}</option>
            ))}
          </select>
          <span className="muted">vs</span>
          <select className="sel" value={idB} onChange={(e) => setIdB(e.target.value)}
            style={{ maxWidth: 280 }}>
            {ids.map((id) => (
              <option key={id} value={id} disabled={id === idA}>{fundById[id]?.name || id}</option>
            ))}
          </select>
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          History is recorded once a day by the data pipeline, so this chart
          grows one point per day. Fund portfolios are disclosed monthly, so
          changes appear as steps when a new portfolio is published.
        </div>
      </div>

      <div className="card">
        {err && (
          <div className="muted center" style={{ padding: 30 }}>
            No history recorded for this category yet.
          </div>
        )}
        {!err && !history && <Spinner label="Loading history…" />}
        {history && series.length === 0 && (
          <div className="muted center" style={{ padding: 30 }}>
            No recorded days for this pair yet — check back after the next daily run.
          </div>
        )}
        {series.length > 0 && (
          <>
            <div className="kpis" style={{ marginBottom: 14 }}>
              <div className="kpi"><div className="v">{fmtPct(latest.value)}</div>
                <div className="l">latest ({latest.date})</div></div>
              <div className="kpi">
                <div className="v" style={{ color: change > 0.05 ? 'var(--danger)' : change < -0.05 ? 'var(--ok)' : 'var(--muted)' }}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)} pts
                </div>
                <div className="l">since {first.date}</div>
              </div>
              <div className="kpi"><div className="v">{series.length}</div>
                <div className="l">days recorded</div></div>
            </div>
            <TrendChart points={series} />
            <div style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => openCompare(idA, idB)}>
                Open detailed comparison →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
