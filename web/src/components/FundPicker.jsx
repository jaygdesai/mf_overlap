import React, { useMemo, useRef, useState } from 'react'
import { fmtAum } from './bits'

export default function FundPicker({ label, funds, value, onChange, exclude }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hl, setHl] = useState(0)
  const boxRef = useRef(null)

  const selected = useMemo(
    () => funds.find((f) => f.id === value) || null,
    [funds, value],
  )

  const results = useMemo(() => {
    if (!open) return []
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    let list = funds
    if (terms.length) {
      list = funds.filter((f) => {
        const hay = `${f.name} ${f.sub} ${f.fh || ''}`.toLowerCase()
        return terms.every((t) => hay.includes(t))
      })
    }
    list = list.filter((f) => f.id !== exclude)
    return list.slice(0, 50)
  }, [funds, query, open, exclude])

  function pick(fund) {
    onChange(fund.id)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && results[hl]) { e.preventDefault(); pick(results[hl]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="picker" ref={boxRef}
      onBlur={(e) => { if (!boxRef.current.contains(e.relatedTarget)) setOpen(false) }}>
      <label>{label}</label>
      <input
        value={open ? query : (selected ? selected.name : '')}
        placeholder="Search any mutual fund…"
        onFocus={() => { setOpen(true); setHl(0) }}
        onChange={(e) => { setQuery(e.target.value); setHl(0) }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="menu">
          {results.length === 0 && (
            <div className="item"><span className="muted small">No funds match.</span></div>
          )}
          {results.map((f, i) => (
            <div key={f.id} tabIndex={-1}
              className={`item${i === hl ? ' hl' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(f) }}
              onMouseEnter={() => setHl(i)}>
              <div className="nm">{f.name}</div>
              <div className="dt">
                <span className="badge">{f.sub}</span>
                {'  '}AUM {fmtAum(f.aum)}{f.pd ? ` · portfolio as of ${f.pd}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
