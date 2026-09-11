import { readPreference } from './lib/preferences.js'
const DEFAULT_ID = '100-sensory-ball-ripple'

export function currentId() {
  return (
    location.hash.replace(/^#\/?/, '') || readPreference('last-toy', DEFAULT_ID)
  )
}

export function navigate(id) {
  location.hash = `/${id}`
}

export function onRouteChange(callback) {
  window.addEventListener('hashchange', () => callback(currentId()))
}
