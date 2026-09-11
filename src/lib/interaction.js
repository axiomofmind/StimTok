// A primary contact retains the legacy pointer API; contacts exposes all fingers.
export function createInteraction(container, surface, meta = {}) {
  const state = {
    x: 0,
    y: 0,
    u: 0.5,
    v: 0.5,
    nx: 0,
    ny: 0,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    pressure: 0,
    down: false,
    active: false,
    dragged: false,
    pulseAge: 99,
    energy: 0,
    pointerType: 'mouse',
    contacts: [],
    cancelled: false,
  }
  const contacts = new Map(),
    listeners = new Set()
  let primary = null,
    lastTap = null
  const hint = document.createElement('div')
  hint.className = 'interaction-hint'
  hint.id = 'toy-instructions'
  hint.textContent = meta.interaction || 'Touch and explore'
  container.append(hint)
  surface.style.touchAction = 'none'
  surface.style.cursor = 'grab'
  surface.tabIndex = 0
  surface.setAttribute('role', 'img')
  surface.setAttribute('aria-label', meta.title || 'Interactive toy')
  surface.setAttribute('aria-describedby', hint.id)
  function point(e, previous) {
    const rect = surface.getBoundingClientRect(),
      now = performance.now()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    const dt = Math.max(0.008, (now - (previous?.time ?? now)) / 1000)
    const dx = previous ? x - previous.x : 0,
      dy = previous ? y - previous.y : 0
    const vx = previous ? previous.vx * 0.35 + (dx / dt) * 0.65 : 0
    const vy = previous ? previous.vy * 0.35 + (dy / dt) * 0.65 : 0
    return {
      x,
      y,
      u: x / Math.max(1, rect.width),
      v: 1 - y / Math.max(1, rect.height),
      nx: (x / Math.max(1, rect.width)) * 2 - 1,
      ny: 1 - (y / Math.max(1, rect.height)) * 2,
      dx,
      dy,
      vx,
      vy,
      speed: Math.hypot(vx, vy),
      pressure: e.pressure || 0.5,
      time: now,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: previous?.startX ?? x,
      startY: previous?.startY ?? y,
      dragged:
        previous?.dragged ||
        Math.hypot(x - (previous?.startX ?? x), y - (previous?.startY ?? y)) >
          6,
    }
  }
  function sync() {
    state.contacts = [...contacts.values()]
  }
  function emit(type, originalEvent) {
    for (const fn of listeners) fn({ ...state, type, originalEvent })
  }
  function down(e) {
    if (e.button > 0) return
    const p = point(e)
    contacts.set(e.pointerId, p)
    sync()
    surface.setPointerCapture?.(e.pointerId)
    if (primary === null) {
      primary = e.pointerId
      Object.assign(state, p, {
        active: true,
        down: true,
        cancelled: false,
        pulseAge: 0,
        energy: 1,
      })
      surface.style.cursor = 'grabbing'
      emit('down', e)
    }
    e.preventDefault()
  }
  function move(e) {
    if (contacts.has(e.pointerId)) {
      const p = point(e, contacts.get(e.pointerId))
      contacts.set(e.pointerId, p)
      sync()
      if (e.pointerId === primary) {
        Object.assign(state, p)
        emit('drag', e)
        if (p.dragged) hint.classList.add('hidden')
      }
      e.preventDefault()
    } else if (primary === null) {
      Object.assign(state, point(e, state), { active: true, pressure: 0 })
      emit('move', e)
    }
  }
  function release(e) {
    const p = contacts.get(e.pointerId)
    if (!p) return
    contacts.delete(e.pointerId)
    sync()
    if (e.pointerId === primary) {
      // Release velocity comes from the last movement, with idle-time decay.
      const decay = Math.exp(-Math.max(0, performance.now() - p.time - 35) / 65)
      Object.assign(state, p, {
        down: false,
        pressure: 0,
        cancelled: e.type === 'pointercancel',
        vx: p.vx * decay,
        vy: p.vy * decay,
        speed: p.speed * decay,
      })
      if (state.cancelled) {
        state.vx = state.vy = state.speed = state.energy = 0
        emit('cancel', e)
      } else if (p.dragged) {
        if (state.speed > 120) emit('fling', e)
      } else {
        state.energy = 1
        hint.classList.add('hidden')
        emit('tap', e)
        // Double-tap is opt-in: it must never unexpectedly erase artwork.
        if (
          meta.doubleTap &&
          lastTap &&
          performance.now() - lastTap.time < 300 &&
          Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 24
        )
          emit('doubletap', e)
        lastTap = { ...p, time: performance.now() }
      }
      emit('up', e)
      primary = null
      surface.style.cursor = 'grab'
    }
    try {
      surface.releasePointerCapture?.(e.pointerId)
    } catch {}
  }
  function leave() {
    if (!state.down) state.active = false
  }
  function cancelPointer(e) {
    release({ pointerId: e.pointerId, type: 'pointercancel' })
  }
  function cancelAll() {
    for (const pointerId of [...contacts.keys()]) cancelPointer({ pointerId })
    state.active = false
    lastTap = null
  }
  function visibility() {
    if (document.hidden) cancelAll()
  }
  function key(e) {
    if (
      ![
        'Enter',
        ' ',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(e.key)
    )
      return
    e.preventDefault()
    const r = surface.getBoundingClientRect()
    if (!state.active)
      Object.assign(state, { x: r.width * 0.5, y: r.height * 0.5 })
    const dx = e.key === 'ArrowLeft' ? -18 : e.key === 'ArrowRight' ? 18 : 0
    const dy = e.key === 'ArrowUp' ? -18 : e.key === 'ArrowDown' ? 18 : 0
    const fake = {
      clientX: r.left + state.x + dx,
      clientY: r.top + state.y + dy,
      pointerId: -1,
      pointerType: 'keyboard',
      pressure: 0.5,
      button: 0,
      preventDefault() {},
    }
    Object.assign(state, point(fake, state), {
      active: true,
      down: true,
      energy: 1,
      pulseAge: 0,
    })
    emit('down', e)
    if (dx || dy) emit('drag', e)
    state.down = false
    if (!dx && !dy) emit('tap', e)
    emit('up', e)
  }
  const bindings = {
    pointerdown: down,
    pointermove: move,
    pointerup: release,
    pointercancel: release,
    lostpointercapture: cancelPointer,
    pointerleave: leave,
    keydown: key,
  }
  for (const [name, fn] of Object.entries(bindings))
    surface.addEventListener(name, fn, { passive: false })
  window.addEventListener('blur', cancelAll)
  document.addEventListener('visibilitychange', visibility)
  return {
    state,
    on(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    step(dt) {
      state.pulseAge += dt
      state.energy *= Math.exp(-dt * 2.8)
      if (!state.down) {
        state.vx *= Math.exp(-dt * 5)
        state.vy *= Math.exp(-dt * 5)
        state.speed = Math.hypot(state.vx, state.vy)
      }
    },
    drawCanvas() {},
    burst() {},
    dispose() {
      window.removeEventListener('blur', cancelAll)
      document.removeEventListener('visibilitychange', visibility)
      for (const [name, fn] of Object.entries(bindings))
        surface.removeEventListener(name, fn)
      listeners.clear()
      hint.remove()
    },
  }
}
