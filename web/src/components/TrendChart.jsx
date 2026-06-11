import React, { useRef, useState } from 'react'

// Lightweight SVG line chart for an overlap time series
// points: [{date: 'YYYY-MM-DD', value: number}]
export default function TrendChart({ points, height = 280 }) {
  const wrapRef = useRef(null)
  const [tip, setTip] = useState(null)
  const width = 800
  const pad = { l: 44, r: 16, t: 16, b: 30 }

  if (!points.length) return null

  const values = points.map((p) => p.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const span = Math.max(hi - lo, 2)
  lo = Math.max(0, lo - span * 0.25)
  hi = Math.min(100, hi + span * 0.25)

  const x = (i) => pad.l + (points.length === 1
    ? (width - pad.l - pad.r) / 2
    : (i / (points.length - 1)) * (width - pad.l - pad.r))
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b)

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${y(lo)} L${x(0).toFixed(1)},${y(lo)} Z`

  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 },
    (_, i) => lo + ((hi - lo) * i) / yTicks)

  const labelEvery = Math.max(1, Math.ceil(points.length / 8))

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    let best = 0
    let bestD = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(x(i) - px)
      if (d < bestD) { bestD = d; best = i }
    })
    setTip({
      i: best,
      left: (x(best) / width) * rect.width,
      top: (y(points[best].value) / height) * rect.height,
    })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}
      onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d7cff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6d7cff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)}
              stroke="rgba(148,163,216,.12)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11"
              fill="var(--muted)">{t.toFixed(0)}%</text>
          </g>
        ))}
        {points.length > 1 && <path d={area} fill="url(#areaFill)" />}
        <path d={path} fill="none" stroke="#6d7cff" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.value)}
              r={tip?.i === i ? 5 : points.length < 40 ? 3.5 : 0}
              fill="#0b1020" stroke="#2dd4bf" strokeWidth="2" />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="10.5"
                fill="var(--muted)">{p.date.slice(5)}</text>
            )}
          </g>
        ))}
      </svg>
      {tip && (
        <div className="chart-tip" style={{
          left: Math.min(tip.left + 10, wrapRef.current.clientWidth - 130),
          top: Math.max(tip.top - 40, 0),
        }}>
          <b>{points[tip.i].value.toFixed(1)}%</b> · {points[tip.i].date}
        </div>
      )}
    </div>
  )
}
