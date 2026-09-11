import { readPreference, savePreference } from './preferences.js'

// Brief material sounds synthesized on-device. No downloads, microphone, or
// autonomous soundtrack; each mounted toy owns and disposes its audio graph.
const voices = {
  pop: [0.09, 340, 65, 1700, 0.18, 0.15, 0.025],
  bead: [0.065, 520, 190, 2000, 0.08, 0.045, 0.075],
  squish: [0.2, 140, 65, 650, 0.14, 0.15, 0.12],
  gather: [0.35, 100, 220, 550, 0.13, 0.16, 0.3],
  stretch: [0.14, 170, 310, 850, 0.1, 0.055, 0.13],
  scrape: [0.13, 0, 0, 2600, 0, 0.19, 0.09],
  snip: [0.07, 800, 250, 3200, 0.06, 0.17, 0.12],
  plop: [0.16, 190, 55, 450, 0.16, 0.07, 0.1],
  water: [0.19, 750, 200, 1100, 0.11, 0.04, 0.09],
  splash: [0.22, 310, 110, 1500, 0.07, 0.16, 0.12],
}

export function attachToySound(v, container) {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext
  let enabled = !!readPreference(
    'sound-enabled',
    readPreference('bubble-sound', false),
  )
  let volume = Math.max(
    0,
    Math.min(1, Number(readPreference('sound-volume', 0.35)) || 0),
  )
  let context,
    master,
    noise,
    disposed = false,
    activeUntil = 0
  const active = new Set(),
    last = new Map()
  const button = document.createElement('button')
  button.dataset.action = 'sound'
  const panel = container.querySelector('.visual-controls')
  panel.querySelector('.control-bar').append(button)
  const label = document.createElement('label')
  label.textContent = 'Master volume'
  const slider = document.createElement('input'),
    output = document.createElement('output')
  slider.type = 'range'
  slider.min = 0
  slider.max = 100
  slider.step = 5
  slider.setAttribute('aria-label', 'Master volume')
  label.append(slider, output)
  panel.querySelector('.control-details').append(label)
  function stop() {
    for (const node of active) {
      try {
        node.stop()
      } catch {}
    }
    active.clear()
  }
  function sync() {
    enabled = !!readPreference(
      'sound-enabled',
      readPreference('bubble-sound', false),
    )
    volume = Math.max(
      0,
      Math.min(1, Number(readPreference('sound-volume', 0.35)) || 0),
    )
    button.textContent = enabled ? '♪' : '♪ ×'
    button.title = Audio
      ? `Sound: ${enabled ? 'on' : 'off'}`
      : 'Sound unavailable'
    button.setAttribute('aria-label', button.title)
    button.setAttribute('aria-pressed', String(enabled && !!Audio))
    button.disabled = slider.disabled = !Audio
    slider.value = Math.round(volume * 100)
    output.value = slider.value + '%'
    if (master)
      master.gain.setTargetAtTime(
        enabled ? volume * 0.7 : 0,
        context.currentTime,
        0.015,
      )
    if (!enabled || !volume) stop()
  }
  function unlock() {
    if (!enabled || !Audio || disposed || document.hidden) return
    try {
      if (!context) {
        context = new Audio()
        master = context.createGain()
        master.gain.value = volume * 0.7
        const limiter = context.createDynamicsCompressor()
        limiter.threshold.value = -14
        limiter.ratio.value = 8
        master.connect(limiter).connect(context.destination)
        noise = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * 0.4),
          context.sampleRate,
        )
        const data = noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      }
      if (context.state === 'suspended') context.resume().catch(() => {})
    } catch {
      /* Audio may be disabled by the browser or embedding app. */
    }
  }
  function gesture(e) {
    if (!e.isTrusted) return
    activeUntil = performance.now() + 4500
    unlock()
    if (e.target.closest?.('[data-action="pause"]')) stop()
  }
  for (const event of ['pointerdown', 'pointerup', 'click', 'keydown'])
    container.addEventListener(event, gesture, true)
  function visibility() {
    if (document.hidden) {
      activeUntil = 0
      stop()
      context?.suspend().catch(() => {})
    }
  }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('toy-sound-change', sync)
  button.onclick = () => {
    savePreference('sound-enabled', !enabled)
    window.dispatchEvent(new Event('toy-sound-change'))
    unlock()
  }
  slider.oninput = () => {
    savePreference('sound-volume', Number(slider.value) / 100)
    window.dispatchEvent(new Event('toy-sound-change'))
  }
  sync()
  v.addDispose(() => {
    disposed = true
    stop()
    for (const event of ['pointerdown', 'pointerup', 'click', 'keydown'])
      container.removeEventListener(event, gesture, true)
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('toy-sound-change', sync)
    if (context) context.close().catch(() => {})
    button.remove()
    label.remove()
  })
  return {
    play(kind, strength = 1, pitch = 1) {
      if (
        disposed ||
        !enabled ||
        !volume ||
        !context ||
        !master ||
        !noise ||
        context.state === 'closed' ||
        v.state.paused ||
        document.hidden
      )
        return
      if (!v.pointer.down && performance.now() > activeUntil) return
      const spec = voices[kind]
      if (
        !spec ||
        active.size >= 12 ||
        context.currentTime - (last.get(kind) ?? -10) < spec[6]
      )
        return
      last.set(kind, context.currentTime)
      const [duration, start, end, frequency, toneLevel, noiseLevel] = spec
      const now = context.currentTime,
        amount = Math.max(0.1, Math.min(1, strength))
      const tune =
        Math.max(0.5, Math.min(2, pitch)) * (0.93 + Math.random() * 0.14)
      function envelope(level) {
        const gain = context.createGain()
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.linearRampToValueAtTime(level * amount, now + 0.006)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
        gain.connect(master)
        return gain
      }
      function finish(source, nodes) {
        active.add(source)
        source.onended = () => {
          active.delete(source)
          source.disconnect()
          nodes.forEach((n) => n.disconnect())
        }
        source.start(now)
        source.stop(now + duration + 0.01)
      }
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = envelope(noiseLevel)
      source.buffer = noise
      filter.type = 'bandpass'
      filter.frequency.value = frequency * tune
      filter.Q.value = kind === 'stretch' ? 5 : 0.8
      source.connect(filter).connect(gain)
      finish(source, [filter, gain])
      if (start) {
        const oscillator = context.createOscillator(),
          tone = envelope(toneLevel)
        oscillator.frequency.setValueAtTime(start * tune, now)
        oscillator.frequency.exponentialRampToValueAtTime(
          end * tune,
          now + duration,
        )
        oscillator.connect(tone)
        finish(oscillator, [tone])
      }
    },
  }
}
