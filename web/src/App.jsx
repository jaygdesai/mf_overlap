import React, { useEffect, useState } from 'react'
import { loadFunds, loadHoldings, loadMeta, loadOverlaps } from './api'
import CompareView from './components/CompareView'
import HeatmapView from './components/HeatmapView'
import TrendsView from './components/TrendsView'
import TopPairsView from './components/TopPairsView'
import { Spinner, ErrorBox } from './components/bits'

const TABS = [
  ['compare', 'Compare', '⚖️'],
  ['heatmap', 'Heatmap', '🟧'],
  ['trends', 'Trends', '📈'],
  ['top', 'Top overlaps', '🏆'],
]

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('compare')
  const [pair, setPair] = useState([null, null])

  useEffect(() => {
    Promise.all([loadMeta(), loadFunds(), loadHoldings(), loadOverlaps()])
      .then(([meta, funds, holdings, overlaps]) => {
        funds.sort((a, b) => (b.aum || 0) - (a.aum || 0))
        setData({ meta, funds, holdings, overlaps })
      })
      .catch(setError)
  }, [])

  function openCompare(a, b) {
    setPair([a, b])
    setTab('compare')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">MF</div>
        <div>
          <h1>MF Overlap</h1>
          <div className="sub">Mutual fund portfolio overlap — updated daily</div>
        </div>
        {data && (
          <div className="meta">
            <div><b>{data.meta.funds.toLocaleString('en-IN')}</b> funds tracked</div>
            <div>Data as of <b>{data.meta.date}</b></div>
          </div>
        )}
      </div>

      <nav className="nav">
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}>
            <span aria-hidden>{icon}</span>{label}
          </button>
        ))}
      </nav>

      {error && <ErrorBox error={error} />}
      {!error && !data && <Spinner />}

      {data && tab === 'compare' && (
        <CompareView funds={data.funds} holdings={data.holdings}
          pair={pair} setPair={setPair} />
      )}
      {data && tab === 'heatmap' && (
        <HeatmapView funds={data.funds} overlaps={data.overlaps}
          openPair={openCompare} />
      )}
      {data && tab === 'trends' && (
        <TrendsView funds={data.funds} overlaps={data.overlaps}
          pair={pair} setPair={setPair} openCompare={openCompare} />
      )}
      {data && tab === 'top' && (
        <TopPairsView funds={data.funds} overlaps={data.overlaps}
          openCompare={openCompare} />
      )}

      <div className="footer">
        Overlap = Σ min(weight in A, weight in B) across common holdings, based on
        each fund's latest disclosed portfolio (disclosed monthly by AMCs; checked
        daily). Data sourced from publicly available fund pages. This tool is for
        information only and is not investment advice.
      </div>
    </div>
  )
}
