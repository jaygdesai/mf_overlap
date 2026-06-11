import { DATA_BASE } from './config'

const cache = new Map()

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path)
  const promise = fetch(`${DATA_BASE}/${path}`).then((res) => {
    if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`)
    return res.json()
  })
  cache.set(path, promise)
  promise.catch(() => cache.delete(path))
  return promise
}

export const loadMeta = () => getJSON('meta.json')
export const loadFunds = () => getJSON('funds.json')
export const loadHoldings = () => getJSON('holdings/latest.json')
export const loadOverlaps = () => getJSON('overlaps/latest.json')
export const loadHistory = (catKey) => getJSON(`history/${catKey}.json`)
