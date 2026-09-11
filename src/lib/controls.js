import { readPreference, savePreference, accessibility } from './preferences.js'
import { toyTuning } from './toy-tuning.js'

export function buildPanel(container, meta, state, applyPalette, notifyReset) {
  const preset = toyTuning[meta.id] || {}
  meta = { ...meta, ...preset }
  Object.assign(state, { ...accessibility(), demo: false })
  const customSliders = new Map()
  const saved = readPreference(`toy:${meta.id}`, {})
  const defaults = {
    speed: preset.speed ?? state.speed,
    intensity: preset.intensity ?? state.intensity,
  }
  function comfortChanged() {
    Object.assign(state, accessibility())
    state.dirty = true
  }
  window.addEventListener('comfort-change', comfortChanged)
  state.speed =
    meta.speedControl === false
      ? defaults.speed
      : (saved.speed ?? defaults.speed)
  state.intensity =
    meta.intensityControl === false
      ? defaults.intensity
      : (saved.intensity ?? defaults.intensity)
  state.dirty = true
  const panel = document.createElement('div')
  panel.className = 'visual-controls'
  panel.innerHTML = `<div class="control-bar"><button data-action="pause">Pause</button><button data-action="reset">Restart</button><button data-action="help" aria-label="Show instructions">?</button><button data-action="toggle-panel" aria-expanded="false">Tune</button></div><div class="control-details" hidden><div class="toy-actions"></div><label>${meta.speedLabel || 'Animation speed'} <input type="range" min="0.2" max="2" step="0.1" value="${state.speed}" data-control="speed"><output>${state.speed.toFixed(1)}</output></label><label>${meta.intensityLabel || 'Light level'} <input type="range" min="0.2" max="1.6" step="0.05" value="${state.intensity}" data-control="intensity"><output>${state.intensity.toFixed(1)}</output></label><label>Color story <select data-control="palette">${(meta.palettes || []).map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}</select></label><div class="palette-swatches"></div><label class="check-control"><input type="checkbox" data-control="demo"> Watch / automatic play</label><button data-action="defaults">Restore settings</button><button data-action="capture">Save image</button></div>`
  container.append(panel)
  const quick = document.createElement('div')
  quick.className = 'toy-actions quick-actions'
  quick.setAttribute('role', 'toolbar')
  quick.setAttribute('aria-label', 'Toy tools')
  quick.hidden = true
  container.append(quick)
  const actionButtons = new Map()
  function selectAction(label) {
    const group = preset.groups?.find((group) => group.includes(label))
    if (group)
      for (const name of group)
        actionButtons
          .get(name)
          ?.setAttribute('aria-pressed', String(name === label))
  }
  const q = (s) => panel.querySelector(s)
  if (meta.speedControl === false)
    q('[data-control="speed"]').parentElement.hidden = true
  if (!meta.automaticPlay)
    q('[data-control="demo"]').parentElement.hidden = true
  if (meta.intensityControl === false)
    q('[data-control="intensity"]').parentElement.hidden = true
  function persist() {
    for (const [i, b] of [...q('.palette-swatches').children].entries())
      b.setAttribute(
        'aria-pressed',
        String(i === Number(q('[data-control="palette"]').value)),
      )
    savePreference(`toy:${meta.id}`, {
      custom: Object.fromEntries(
        [...customSliders.keys()].map((key) => [key, state[key]]),
      ),
      speed: state.speed,
      intensity: state.intensity,
      palette: Number(q('[data-control="palette"]').value),
    })
    state.dirty = true
  }
  function setPaused(value) {
    state.paused = value
    q('[data-action="pause"]').textContent = value ? 'Play' : 'Pause'
    q('[data-action="pause"]').setAttribute('aria-pressed', String(value))
    state.dirty = true
  }
  function toggle(open) {
    q('.control-details').hidden = !open
    q('[data-action="toggle-panel"]').setAttribute(
      'aria-expanded',
      String(open),
    )
    q('[data-action="toggle-panel"]').textContent = open ? 'Done' : 'Tune'
    container.classList.toggle('tuning', open)
  }
  q('[data-action="toggle-panel"]').onclick = () =>
    toggle(q('.control-details').hidden)
  q('[data-action="pause"]').onclick = () => setPaused(!state.paused)
  q('[data-action="help"]').onclick = () =>
    container.querySelector('.interaction-hint')?.classList.toggle('hidden')
  q('[data-action="reset"]').onclick = () => {
    container.dispatchEvent(
      new CustomEvent('restart-toy', {
        detail: { paused: state.paused },
        bubbles: true,
      }),
    )
  }
  q('[data-action="defaults"]').onclick = () => {
    state.speed = defaults.speed
    state.intensity = defaults.intensity
    state.demo = false
    q('[data-control="demo"]').checked = false
    for (const [key, { input, output, initial }] of customSliders) {
      state[key] = initial
      input.value = initial
      output.value = String(initial)
      input.dispatchEvent(new Event('input'))
    }
    for (const name of ['speed', 'intensity']) {
      q(`[data-control="${name}"]`).value = defaults[name]
      q(`[data-control="${name}"]`).nextElementSibling.value =
        defaults[name].toFixed(1)
    }
    q('[data-control="palette"]').value = 0
    applyPalette(0)
    persist()
  }
  for (const name of ['speed', 'intensity'])
    q(`[data-control="${name}"]`).oninput = (e) => {
      state[name] = Number(e.target.value)
      e.target.nextElementSibling.value = state[name].toFixed(1)
      persist()
    }
  q('[data-control="palette"]').onchange = (e) => {
    applyPalette(Number(e.target.value))
    persist()
  }
  q('[data-control="demo"]').onchange = (e) => {
    state.demo = e.target.checked
    state.dirty = true
  }
  for (const [i, p] of (meta.palettes || []).entries()) {
    const b = document.createElement('button')
    b.className = 'palette-swatch'
    b.title = p.name
    b.setAttribute('aria-label', p.name)
    const colors = Object.values(p)
      .flat()
      .filter((c) => typeof c === 'string' && c.startsWith('#'))
      .slice(0, 3)
    b.style.background = `linear-gradient(135deg,${colors.join(',')})`
    b.onclick = () => {
      q('[data-control="palette"]').value = i
      applyPalette(i)
      persist()
    }
    q('.palette-swatches').append(b)
  }
  q('[data-action="capture"]').onclick = () => {
    state.capture = () => {
      const canvas = container.querySelector('canvas')
      if (!canvas) return
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob),
          a = document.createElement('a')
        a.href = url
        a.download = `${meta.id}.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      })
    }
    state.dirty = true
  }
  setPaused(state.paused)
  const paletteIndex = Math.min(
    (meta.palettes?.length || 1) - 1,
    saved.palette || 0,
  )
  if (meta.palettes?.length) {
    q('[data-control="palette"]').value = paletteIndex
    applyPalette(paletteIndex)
  }
  function addAction(label, callback) {
    const button = document.createElement('button')
    button.textContent = label
    button.dataset.toyAction = label
    actionButtons.set(label, button)
    const group = preset.groups?.find((group) => group.includes(label))
    if (group)
      button.setAttribute(
        'aria-pressed',
        String(
          label ===
            (preset.active?.find((name) => group.includes(name)) || group[0]),
        ),
      )
    button.onclick = () => {
      callback()
      selectAction(label)
      state.dirty = true
    }
    if (preset.quick?.includes(label)) {
      quick.hidden = false
      quick.append(button)
    } else q('.toy-actions').append(button)
    return button
  }
  function addSlider(label, key, min, max, step, initial) {
    initial = preset.custom?.[key] ?? initial
    label = preset.labels?.[key] ?? label
    state[key] = Math.max(
      min,
      Math.min(max, Number(saved.custom?.[key] ?? initial)),
    )
    const el = document.createElement('label')
    el.textContent = label
    const input = document.createElement('input')
    input.type = 'range'
    Object.assign(input, { min, max, step, value: state[key] })
    input.setAttribute('aria-label', label)
    input.dataset.setting = key
    const output = document.createElement('output')
    output.value = String(state[key])
    customSliders.set(key, { input, output, initial })
    input.oninput = () => {
      state[key] = Number(input.value)
      output.value = input.value
      persist()
    }
    el.append(input, output)
    q('.toy-actions').append(el)
    return input
  }
  return {
    panel,
    setPaused,
    addAction,
    addSlider,
    dispose() {
      window.removeEventListener('comfort-change', comfortChanged)
      container.classList.remove('tuning')
      quick.remove()
      panel.remove()
    },
  }
}
