import React from 'react'

export function Spinner({ label = 'Loading data…' }) {
  return (
    <div className="spinner">
      <div className="ring" />
      <div>{label}</div>
    </div>
  )
}

export function ErrorBox({ error }) {
  return (
    <div className="error-box">
      <b>Could not load data.</b> {String(error?.message || error)}
      <div className="small" style={{ marginTop: 6 }}>
        If this is a fresh deployment, the first daily data run may not have
        completed yet.
      </div>
    </div>
  )
}

export function fmtAum(aum) {
  if (!aum) return '—'
  const cr = Number(aum)
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(1)}k Cr`
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

export function fmtPct(v, digits = 1) {
  if (v === null || v === undefined) return '—'
  return `${Number(v).toFixed(digits)}%`
}

// Color scale for overlap 0..100: deep blue -> teal -> amber -> red.
export function overlapColor(v) {
  const stops = [
    [0, [30, 41, 76]],
    [25, [13, 92, 110]],
    [50, [16, 150, 120]],
    [70, [202, 138, 4]],
    [85, [220, 38, 38]],
    [100, [153, 27, 27]],
  ]
  const x = Math.max(0, Math.min(100, v))
  for (let s = 1; s < stops.length; s++) {
    if (x <= stops[s][0]) {
      const [x0, c0] = stops[s - 1]
      const [x1, c1] = stops[s]
      const t = (x - x0) / (x1 - x0 || 1)
      const c = c0.map((v0, k) => Math.round(v0 + (c1[k] - v0) * t))
      return `rgb(${c[0]},${c[1]},${c[2]})`
    }
  }
  return 'rgb(153,27,27)'
}

export function overlapVerdict(v) {
  if (v >= 70) return { word: 'Very high overlap', color: 'var(--danger)' }
  if (v >= 50) return { word: 'High overlap', color: 'var(--warn)' }
  if (v >= 30) return { word: 'Moderate overlap', color: 'var(--accent-2)' }
  return { word: 'Low overlap', color: 'var(--ok)' }
}

export function Gauge({ value, size = 130 }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(100, value)) / 100
  const verdict = overlapVerdict(value)
  return (
    <svg width={size} height={size} role="img" aria-label={`Overlap ${value?.toFixed(1)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(148,163,216,.15)" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={verdict.color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="48%" textAnchor="middle" fill="var(--text)"
        fontSize={size * 0.21} fontWeight="800">
        {value?.toFixed(1)}
      </text>
      <text x="50%" y="64%" textAnchor="middle" fill="var(--muted)" fontSize={size * 0.1}>
        % overlap
      </text>
    </svg>
  )
}
