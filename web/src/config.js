// Where the daily-generated JSON data lives.
//
// - On the website, data/ is deployed next to the app, so a relative path works.
// - Inside the Android (Capacitor) app, assets are bundled at build time, so we
//   always fetch fresh data from the published site instead.
export const REMOTE_DATA_BASE = 'https://jaygdesai.github.io/mf_overlap/data'

const isNative = typeof window !== 'undefined'
  && window.Capacitor?.isNativePlatform?.()

export const DATA_BASE = isNative ? REMOTE_DATA_BASE : 'data'
