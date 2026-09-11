export function readPreference(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`stimtok:${key}`)) ?? fallback
  } catch {
    return fallback
  }
}
export function savePreference(key, value) {
  try {
    localStorage.setItem(`stimtok:${key}`, JSON.stringify(value))
  } catch {
    /* Private mode or full storage. */
  }
}
export const accessibility = () =>
  readPreference('accessibility', {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    reducedFlash: true,
    quality: 'balanced',
  })
