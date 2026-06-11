import React, { useMemo } from 'react'
import FundPicker from './FundPicker'
import { compareFunds } from '../overlap'
import { Gauge, fmtPct, overlapVerdict } from './bits'

function HoldingsBar({ value, max }) {
  return (
    <div className="minibar">
      <div style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }} />
    </div>
  )
}

export default function CompareView({ funds, holdings, pair, setPair }) {
  const [idA, idB] = pair
  const fundA = funds.find((f) => f.id === idA)
  const fundB = funds.find((f) => f.id === idB)

  const result = useMemo(() => {
    if (!idA || !idB || !holdings[idA] || !holdings[idB]) return null
    return compareFunds(holdings[idA], holdings[idB])
  }, [holdings, idA, idB])

  const maxMin = result?.common[0]?.min || 1
  const verdict = result ? overlapVerdict(result.overlap) : null

  return (
    <div className="stack">
      <div className="card">
        <h3>Pick any two funds</h3>
        <div className="row">
          <FundPicker label="Fund A" funds={funds} value={idA} exclude={idB}
            onChange={(id) => setPair([id, idB])} />
          <FundPicker label="Fund B" funds={funds} value={idB} exclude={idA}
            onChange={(id) => setPair([idA, id])} />
        </div>
      </div>

      {!result && (
        <div className="card center muted" style={{ padding: 40 }}>
          Select two funds to see how much of their portfolios overlap.
        </div>
      )}

      {result && (
        <>
          <div className="card">
            <div className="gauge-wrap">
              <Gauge value={result.overlap} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: verdict.color }}>
                  {verdict.word}
                </div>
                <div className="muted small" style={{ margin: '6px 0 14px', maxWidth: 520 }}>
                  {fmtPct(result.overlap)} of these two portfolios is invested in the
                  same instruments (sum of the smaller weight on each common holding).
                </div>
                <div className="kpis">
                  <div className="kpi"><div className="v">{result.common.length}</div>
                    <div className="l">common holdings</div></div>
                  <div className="kpi"><div className="v">{holdings[idA].h.length}</div>
                    <div className="l">{fundA?.name.split(' ').slice(0, 2).join(' ')} holdings</div></div>
                  <div className="kpi"><div className="v">{holdings[idB].h.length}</div>
                    <div className="l">{fundB?.name.split(' ').slice(0, 2).join(' ')} holdings</div></div>
                  <div className="kpi"><div className="v">{holdings[idA].pd || '—'}</div>
                    <div className="l">portfolio A as of</div></div>
                  <div className="kpi"><div className="v">{holdings[idB].pd || '—'}</div>
                    <div className="l">portfolio B as of</div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card scroll-x">
            <h3>Common holdings ({result.common.length})</h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th className="num">Fund A</th>
                  <th className="num">Fund B</th>
                  <th className="num">Overlap</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {result.common.slice(0, 60).map((row) => (
                  <tr key={row.key}>
                    <td>
                      <div>{row.name}</div>
                      <div className="sector">{row.sector}</div>
                    </td>
                    <td className="num">{fmtPct(row.a, 2)}</td>
                    <td className="num">{fmtPct(row.b, 2)}</td>
                    <td className="num"><b>{fmtPct(row.min, 2)}</b></td>
                    <td><HoldingsBar value={row.min} max={maxMin} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.common.length > 60 && (
              <div className="muted small" style={{ marginTop: 8 }}>
                Showing top 60 of {result.common.length} common holdings.
              </div>
            )}
          </div>

          <div className="grid2">
            {[['Only in Fund A', result.onlyA, 'a', fundA],
              ['Only in Fund B', result.onlyB, 'b', fundB]].map(
              ([title, rows, field, fund]) => (
                <div className="card" key={field}>
                  <h3>{title} <span className="muted">— {fund?.name}</span></h3>
                  <table className="tbl">
                    <tbody>
                      {rows.slice(0, 10).map((row) => (
                        <tr key={row.key}>
                          <td>
                            <div>{row.name}</div>
                            <div className="sector">{row.sector}</div>
                          </td>
                          <td className="num">{fmtPct(row[field], 2)}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td className="muted small">Nothing unique — fully contained.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  )
}
