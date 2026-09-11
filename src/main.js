import {
  readPreference,
  savePreference,
  accessibility,
} from './lib/preferences.js'
import './style.css'
import { manifest } from './manifest.js'
import { navigate, onRouteChange, currentId } from './router.js'

// The source archive still contains all 100 experiments, but only these
// deliberately curated toys enter the production bundle.
const modules = {
  './visuals/073-holographic-shimmer.js': () =>
    import('./visuals/073-holographic-shimmer.js'),
  './visuals/048-paint-pour-marble.js': () =>
    import('./visuals/048-paint-pour-marble.js'),
  './visuals/025-voronoi-shift.js': () =>
    import('./visuals/025-voronoi-shift.js'),
  './visuals/086-blackhole-accretion.js': () =>
    import('./visuals/086-blackhole-accretion.js'),
  './visuals/041-silk-cloth-ripple.js': () =>
    import('./visuals/041-silk-cloth-ripple.js'),
  './visuals/070-fractal-tree-zoom.js': () =>
    import('./visuals/070-fractal-tree-zoom.js'),
  './visuals/001-ceiling-fan.js': () => import('./visuals/001-ceiling-fan.js'),
  './visuals/002-pinwheel.js': () => import('./visuals/002-pinwheel.js'),
  './visuals/003-spinning-top.js': () =>
    import('./visuals/003-spinning-top.js'),
  './visuals/015-prism-refraction.js': () =>
    import('./visuals/015-prism-refraction.js'),
  './visuals/018-kaleidoscope.js': () =>
    import('./visuals/018-kaleidoscope.js'),
  './visuals/030-jellyfish-drift.js': () =>
    import('./visuals/030-jellyfish-drift.js'),
  './visuals/032-koi-pond-ripples.js': () =>
    import('./visuals/032-koi-pond-ripples.js'),
  './visuals/043-ink-fluid-art.js': () =>
    import('./visuals/043-ink-fluid-art.js'),
  './visuals/044-soap-cutting.js': () =>
    import('./visuals/044-soap-cutting.js'),
  './visuals/045-slime-stretch.js': () =>
    import('./visuals/045-slime-stretch.js'),
  './visuals/046-sand-mandala-rake.js': () =>
    import('./visuals/046-sand-mandala-rake.js'),
  './visuals/049-bubble-wrap-pop.js': () =>
    import('./visuals/049-bubble-wrap-pop.js'),
  './visuals/047-playdoh-extruder.js': () =>
    import('./visuals/047-playdoh-extruder.js'),
  './visuals/053-stress-ball-squish.js': () =>
    import('./visuals/053-stress-ball-squish.js'),
  './visuals/060-glitter-snowglobe.js': () =>
    import('./visuals/060-glitter-snowglobe.js'),
  './visuals/063-neon-tunnel.js': () => import('./visuals/063-neon-tunnel.js'),
  './visuals/056-lava-lamp.js': () => import('./visuals/056-lava-lamp.js'),
  './visuals/065-plasma-ball.js': () => import('./visuals/065-plasma-ball.js'),
  './visuals/066-wireframe-morph.js': () =>
    import('./visuals/066-wireframe-morph.js'),
  './visuals/068-liquid-metal-metaball.js': () =>
    import('./visuals/068-liquid-metal-metaball.js'),
  './visuals/069-spirograph-loop.js': () =>
    import('./visuals/069-spirograph-loop.js'),
  './visuals/071-flow-field-particles.js': () =>
    import('./visuals/071-flow-field-particles.js'),
  './visuals/081-warp-speed-tunnel.js': () =>
    import('./visuals/081-warp-speed-tunnel.js'),
  './visuals/091-lightning-branch-loop.js': () =>
    import('./visuals/091-lightning-branch-loop.js'),
  './visuals/093-liquid-motion-timer.js': () =>
    import('./visuals/093-liquid-motion-timer.js'),
  './visuals/094-fidget-spinner-blur.js': () =>
    import('./visuals/094-fidget-spinner-blur.js'),
  './visuals/098-glitter-wand-tumble.js': () =>
    import('./visuals/098-glitter-wand-tumble.js'),
  './visuals/099-pendulum-fidget-swirl.js': () =>
    import('./visuals/099-pendulum-fidget-swirl.js'),
  './visuals/100-sensory-ball-ripple.js': () =>
    import('./visuals/100-sensory-ball-ripple.js'),
  './visuals/101-jelly-pal.js': () => import('./visuals/101-jelly-pal.js'),
  './visuals/102-bloom-brush.js': () => import('./visuals/102-bloom-brush.js'),
}

const stage = document.getElementById('stage')
document.querySelector('.brand p').textContent =
  `${manifest.length} tactile digital toys`
const menu = document.getElementById('menu')
const search = document.getElementById('search')
const app = document.getElementById('app')
const sidebar = document.getElementById('sidebar')
const sidebarToggle = document.getElementById('sidebar-toggle')
const mobileLayout = window.matchMedia(
  '(max-width: 720px), (max-width: 1024px) and (max-height: 500px)',
)
const backdrop = document.getElementById('menu-backdrop')
let favorites = readPreference('favorites', [])
let recent = readPreference('recent', [])
let filter = 'All'
let listView = readPreference('list-view', false)
let activeDispose = null,
  loadToken = 0,
  activeId = null
const featured = [
  '100-sensory-ball-ripple',
  '049-bubble-wrap-pop',
  '101-jelly-pal',
  '102-bloom-brush',
]
const shortNames = {
  '081-warp-speed-tunnel': 'Star Tunnel',
  '066-wireframe-morph': 'Wireframe Morph',
  '015-prism-refraction': 'Prism',
  '030-jellyfish-drift': 'Jellyfish',
  '063-neon-tunnel': 'Neon Tunnel',
}
function setSidebarCollapsed(collapsed) {
  app.classList.toggle('sidebar-collapsed', collapsed)
  sidebar.inert = collapsed
  sidebar.setAttribute('aria-hidden', String(collapsed))
  sidebarToggle.textContent = collapsed ? '☰' : '×'
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed))
  sidebarToggle.setAttribute(
    'aria-label',
    collapsed ? 'Browse toys' : 'Close toy menu',
  )
  backdrop.hidden = collapsed || !mobileLayout.matches
  document.getElementById('workspace').inert =
    !collapsed && mobileLayout.matches
  savePreference('sidebar-collapsed', collapsed)
}
setSidebarCollapsed(
  mobileLayout.matches || readPreference('sidebar-collapsed', false),
)
sidebarToggle.onclick = () => {
  const collapsed = app.classList.contains('sidebar-collapsed')
  setSidebarCollapsed(!collapsed)
  // Keep mobile keyboards closed until the user explicitly taps Search.
  if (collapsed && !mobileLayout.matches) search.focus()
}
backdrop.onclick = () => {
  setSidebarCollapsed(true)
  sidebarToggle.focus()
}
mobileLayout.addEventListener('change', () =>
  setSidebarCollapsed(mobileLayout.matches),
)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    setSidebarCollapsed(true)
    sidebarToggle.focus()
    stage.classList.remove('tuning')
    const details = stage.querySelector('.control-details')
    if (details) {
      details.hidden = true
      const toggle = stage.querySelector('[data-action="toggle-panel"]')
      toggle.textContent = 'Tune'
      toggle.setAttribute('aria-expanded', 'false')
    }
  }
  if (e.key === 'Tab' && !backdrop.hidden) {
    const focusables = [
      sidebarToggle,
      ...sidebar.querySelectorAll('input,select,summary,button'),
    ].filter((el) => el.getClientRects().length && !el.disabled)
    const first = focusables[0],
      last = focusables.at(-1)
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
})
const filters = document.getElementById('browse-filters')
for (const name of [
  'All',
  'Favorites',
  'Recent',
  ...new Set(manifest.map((x) => x.category)),
]) {
  const button = document.createElement('button')
  button.textContent = name
  button.onclick = () => {
    filter = name
    renderMenu(search.value)
  }
  filters.append(button)
}
function renderMenu(query = '') {
  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const q = normalize(query.trim())
  const synonyms = {
    squishy: 'jelly stress',
    fluid: 'ink liquid flow',
    geometric: 'geometry pattern prism',
    calming: 'sand bloom pond jelly',
  }
  const terms = (synonyms[q] || q).split(' ')
  let items = manifest.filter((v) => {
    const text = normalize(v.title + ' ' + v.category + ' ' + v.verb)
    return (
      (!q || terms.some((t) => text.includes(t))) &&
      (filter === 'All' ||
        filter === v.category ||
        (filter === 'Favorites' && favorites.includes(v.id)) ||
        (filter === 'Recent' && recent.includes(v.id)))
    )
  })
  if (filter === 'Recent')
    items.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
  if (filter === 'All' && !q)
    items.sort(
      (a, b) =>
        (featured.includes(a.id) ? featured.indexOf(a.id) : 99) -
        (featured.includes(b.id) ? featured.indexOf(b.id) : 99),
    )
  menu.classList.toggle('list-view', listView)
  filters
    .querySelectorAll('button')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(b.textContent === filter)),
    )
  document.getElementById('result-count').textContent = items.length + ' toys'
  menu.replaceChildren()
  if (!items.length) {
    const p = document.createElement('p')
    p.className = 'empty-state'
    p.textContent =
      filter === 'Favorites'
        ? 'Tap the heart on a toy to keep it here.'
        : 'No toys found. Try another material or gesture.'
    const clear = document.createElement('button')
    clear.textContent = 'Show all toys'
    clear.onclick = () => {
      filter = 'All'
      search.value = ''
      renderMenu()
    }
    menu.append(p, clear)
    return
  }
  for (const item of items) {
    const button = document.createElement('button')
    button.className = 'toy-card' + (item.id === activeId ? ' active' : '')
    button.setAttribute('aria-current', item.id === activeId ? 'page' : 'false')
    button.innerHTML = `<img src="${import.meta.env.BASE_URL}thumbs/${item.id}.webp" alt="" loading="lazy"><span class="toy-card-copy"><span class="toy-title">${shortNames[item.id] || item.title}</span><span class="toy-verb">${item.verb} ${favorites.includes(item.id) ? '· ♥' : ''}</span></span>`
    button.onclick = () => {
      navigate(item.id)
      if (mobileLayout.matches) setSidebarCollapsed(true)
    }
    menu.append(button)
  }
}
function header(entry) {
  document.getElementById('toy-name').textContent =
    shortNames[entry.id] || entry.title
  document.getElementById('toy-category').textContent =
    entry.category + ' / ' + entry.verb
  const favorite = document.getElementById('favorite-toy')
  favorite.textContent = favorites.includes(entry.id) ? '♥' : '♡'
  favorite.setAttribute('aria-pressed', String(favorites.includes(entry.id)))
  document.title = (shortNames[entry.id] || entry.title) + ' · StimTok'
}
async function loadVisual(id, opts = {}) {
  const token = ++loadToken
  const entry = manifest.find((v) => v.id === id)
  if (activeDispose) {
    activeDispose()
    activeDispose = null
  }
  stage.replaceChildren()
  stage.classList.remove('tuning')
  const status = document.getElementById('load-status')
  if (!entry) {
    status.textContent = 'That toy could not be found.'
    const button = document.createElement('button')
    button.className = 'recovery'
    button.textContent = 'Play Sensory Jelly Ball'
    button.onclick = () => navigate('100-sensory-ball-ripple')
    stage.append(button)
    return
  }
  status.textContent = 'Preparing ' + entry.title + '…'
  activeId = id
  header(entry)
  renderMenu(search.value)
  try {
    const mod = await modules[`./visuals/${id}.js`]()
    if (token !== loadToken) return
    activeDispose = mod.mount(stage, opts)
    status.textContent = ''
    savePreference('last-toy', id)
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12)
    savePreference('recent', recent)
  } catch (error) {
    if (token !== loadToken) return
    console.error(error)
    status.textContent = 'This toy could not load. Please try again.'
    stage.replaceChildren()
    const button = document.createElement('button')
    button.textContent = 'Retry'
    button.className = 'recovery'
    button.onclick = () => loadVisual(id)
    stage.append(button)
  }
}
document.getElementById('favorite-toy').onclick = () => {
  if (!activeId) return
  favorites = favorites.includes(activeId)
    ? favorites.filter((x) => x !== activeId)
    : [...favorites, activeId]
  savePreference('favorites', favorites)
  header(manifest.find((x) => x.id === activeId))
  renderMenu(search.value)
}
for (const [id, step] of [
  ['previous-toy', -1],
  ['next-toy', 1],
])
  document.getElementById(id).onclick = () =>
    navigate(
      manifest[
        (manifest.findIndex((x) => x.id === activeId) +
          step +
          manifest.length) %
          manifest.length
      ].id,
    )
document.getElementById('surprise').onclick = () => {
  const options = manifest.filter((x) => !recent.slice(0, 4).includes(x.id))
  navigate(options[Math.floor(Math.random() * options.length)].id)
  if (mobileLayout.matches) setSidebarCollapsed(true)
}
document.getElementById('view-toggle').onclick = (e) => {
  listView = !listView
  savePreference('list-view', listView)
  e.target.textContent = listView ? 'Cards' : 'List'
  renderMenu(search.value)
}
document.getElementById('focus-mode').onclick = (e) => {
  const focused = app.classList.toggle('focus-mode')
  e.target.setAttribute('aria-pressed', String(focused))
  e.target.textContent = focused ? 'Exit focus' : 'Focus'
  if (focused) setSidebarCollapsed(true)
}
const comfort = accessibility()
for (const [id, key] of [
  ['reduce-motion', 'reducedMotion'],
  ['reduce-flash', 'reducedFlash'],
]) {
  const input = document.getElementById(id)
  input.checked = comfort[key]
  input.onchange = () => {
    comfort[key] = input.checked
    savePreference('accessibility', comfort)
    window.dispatchEvent(new Event('comfort-change'))
  }
}
document.getElementById('quality').value = comfort.quality
document.getElementById('quality').onchange = (e) => {
  comfort.quality = e.target.value
  savePreference('accessibility', comfort)
  window.dispatchEvent(new Event('comfort-change'))
}
stage.addEventListener('restart-toy', (e) =>
  loadVisual(activeId, { ...e.detail, fresh: true }),
)
search.addEventListener('input', () => renderMenu(search.value))
onRouteChange(loadVisual)
renderMenu()
loadVisual(currentId())
