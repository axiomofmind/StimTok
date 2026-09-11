import * as THREE from 'three'

export { THREE }

import { createInteraction } from './interaction.js'
import { buildPanel } from './controls.js'
export { createInteraction }

export function threeVisual(container, opts = {}, meta = {}, cfg = {}) {
  const state = {
    speed: opts.speed ?? 1,
    intensity: opts.intensity ?? 1,
    paused: opts.paused ?? false,
    palette: meta.palettes?.[0] ?? null,
    t: 0,
  }
  const w = Math.max(1, container.clientWidth)
  const h = Math.max(1, container.clientHeight)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    cfg.fov ?? 50,
    w / h,
    cfg.near ?? 0.1,
    cfg.far ?? 400,
  )
  camera.position.set(...(cfg.position ?? [0, 0, 6]))
  camera.lookAt(...(cfg.lookAt ?? [0, 0, 0]))

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(w, h)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  if (cfg.shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  const frameCbs = []
  const paletteCbs = []
  const resizeCbs = []
  const resetCbs = []
  const disposers = []
  const interaction = createInteraction(container, renderer.domElement, meta)
  interaction.on(() => {
    state.dirty = true
  })
  state.pointer = interaction.state

  // A light inertial camera rig gives every 3D scene direct manipulation,
  // while taps are raycast into the scene and marked at the actual hit point.
  const originalCamera = camera.position.clone()
  function fitCamera(width, height) {
    if (cfg.interactionMode === 'shader') return
    const target = new THREE.Vector3(...(cfg.lookAt ?? [0, 0, 0]))
    camera.position
      .copy(originalCamera)
      .sub(target)
      .multiplyScalar(Math.max(1, 0.9 / (width / height)))
      .add(target)
  }
  fitCamera(w, h)
  const cameraHome = camera.position.clone()
  const lookHome = new THREE.Vector3(...(cfg.lookAt ?? [0, 0, 0]))
  const homeOffset = cameraHome.clone().sub(lookHome)
  const homeSpherical = new THREE.Spherical().setFromVector3(homeOffset)
  const orbit = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0 }
  const raycaster = new THREE.Raycaster()
  raycaster.params.Points.threshold = 0.12
  const hitRings = []
  const cameraInteraction = cfg.cameraInteraction === true

  function pick() {
    raycaster.setFromCamera(
      new THREE.Vector2(interaction.state.nx, interaction.state.ny),
      camera,
    )
    return raycaster
      .intersectObjects(scene.children, true)
      .find((hit) => !hit.object.userData.noInteraction)
  }

  function markHit(hit) {
    if (!hit || cfg.hitInteraction !== true) return
    const distance = camera.position.distanceTo(hit.point)
    const geometry = new THREE.RingGeometry(0.55, 0.72, 40)
    const material = new THREE.MeshBasicMaterial({
      color: state.palette?.glow ?? state.palette?.shine ?? '#ffffff',
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.userData.noInteraction = true
    ring.position.copy(hit.point)
    ring.quaternion.copy(camera.quaternion)
    ring.scale.setScalar(Math.max(0.025, distance * 0.018))
    scene.add(ring)
    hitRings.push({ ring, geometry, material, age: 0 })
    state.lastHit = { object: hit.object, point: hit.point.clone() }
  }

  interaction.on((event) => {
    if (event.type === 'drag' && cameraInteraction) {
      const rect = renderer.domElement.getBoundingClientRect()
      orbit.yaw -= (event.dx / Math.max(1, rect.width)) * Math.PI * 1.8
      orbit.pitch -= (event.dy / Math.max(1, rect.height)) * Math.PI * 1.2
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch, -1.15, 1.15)
      orbit.vyaw = -(event.vx / Math.max(1, rect.width)) * 0.32
      orbit.vpitch = -(event.vy / Math.max(1, rect.height)) * 0.22
    } else if (event.type === 'tap') {
      markHit(pick())
    } else if (event.type === 'doubletap' && cameraInteraction) {
      orbit.yaw = orbit.pitch = orbit.vyaw = orbit.vpitch = 0
    }
  })

  const applyPalette = (i) => {
    state.palette = meta.palettes[i]
    paletteCbs.forEach((cb) => cb(state.palette))
  }
  const controls = buildPanel(container, meta, state, applyPalette, () => {
    state.t = 0
    resetCbs.forEach((cb) => cb())
    state.dirty = true
  })
  const { panel, setPaused, addAction, addSlider } = controls

  const clock = new THREE.Clock()
  let rafId
  function tick() {
    rafId = requestAnimationFrame(tick)
    const raw = Math.min(clock.getDelta(), 0.05)
    interaction.step(raw)
    if (state.paused && !state.dirty && !state.capture) return
    const dt = state.paused
      ? 0
      : raw * state.speed * (state.reducedMotion ? 0.45 : 1)
    state.dirty = false
    state.t += dt
    frameCbs.forEach((cb) => cb(dt, state.t, state))

    if (cameraInteraction) {
      if (!interaction.state.down) {
        orbit.yaw += orbit.vyaw * raw
        orbit.pitch = THREE.MathUtils.clamp(
          orbit.pitch + orbit.vpitch * raw,
          -1.15,
          1.15,
        )
        orbit.vyaw *= Math.exp(-raw * 5.5)
        orbit.vpitch *= Math.exp(-raw * 5.5)
      }
      const hoverYaw = interaction.state.active
        ? -interaction.state.nx * 0.035
        : 0
      const hoverPitch = interaction.state.active
        ? interaction.state.ny * 0.025
        : 0
      const spherical = homeSpherical.clone()
      spherical.theta += orbit.yaw + hoverYaw
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + orbit.pitch + hoverPitch,
        0.08,
        Math.PI - 0.08,
      )
      camera.position
        .copy(lookHome)
        .add(new THREE.Vector3().setFromSpherical(spherical))
      camera.lookAt(lookHome)
    }

    for (let i = hitRings.length - 1; i >= 0; i--) {
      const item = hitRings[i]
      item.age += raw
      item.ring.quaternion.copy(camera.quaternion)
      item.ring.scale.multiplyScalar(1 + raw * 4.2)
      item.material.opacity = Math.max(0, 0.9 * (1 - item.age / 0.65))
      if (item.age >= 0.65) {
        scene.remove(item.ring)
        item.geometry.dispose()
        item.material.dispose()
        hitRings.splice(i, 1)
      }
    }
    const desiredDpr = Math.min(
      window.devicePixelRatio || 1,
      state.quality === 'low' ? 1 : state.quality === 'high' ? 2 : 1.5,
    )
    if (renderer.getPixelRatio() !== desiredDpr)
      renderer.setPixelRatio(desiredDpr)
    renderer.render(scene, camera)
    if (state.capture) {
      const capture = state.capture
      state.capture = null
      capture()
    }
  }

  function onWinResize() {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    camera.aspect = w / h
    fitCamera(w, h)
    camera.updateProjectionMatrix()
    state.dirty = true
    renderer.setSize(w, h)
    resizeCbs.forEach((cb) => cb(w, h))
  }
  const resizeObserver = new ResizeObserver(onWinResize)
  resizeObserver.observe(container)
  window.addEventListener('resize', onWinResize)
  let backgroundPaused = false
  const onVis = () => {
    if (document.hidden) {
      backgroundPaused = !state.paused
      if (backgroundPaused) setPaused(true)
    } else if (backgroundPaused) {
      backgroundPaused = false
      setPaused(false)
    }
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    scene,
    camera,
    renderer,
    state,
    addAction,
    addSlider,
    pointer: interaction.state,
    onPointer: interaction.on,
    pick,
    burst: interaction.burst,
    onFrame: (cb) => frameCbs.push(cb),
    onPalette: (cb) => {
      paletteCbs.push(cb)
      if (state.palette) cb(state.palette)
    },
    onResize: (cb) => resizeCbs.push(cb),
    onReset: (cb) => resetCbs.push(cb),
    addDispose: (fn) => disposers.push(fn),
    start() {
      tick()
      return () => {
        cancelAnimationFrame(rafId)
        resizeObserver.disconnect()
        window.removeEventListener('resize', onWinResize)
        document.removeEventListener('visibilitychange', onVis)
        interaction.dispose()
        controls.dispose()
        hitRings.forEach(({ ring, geometry, material }) => {
          scene.remove(ring)
          geometry.dispose()
          material.dispose()
        })
        disposers.forEach((f) => f())
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            mats.forEach((m) => {
              for (const k of Object.keys(m)) {
                const v = m[k]
                if (v && v.isTexture) v.dispose()
              }
              m.dispose()
            })
          }
        })
        renderer.dispose()
        // dispose() frees GPU resources but leaves the WebGL context alive
        // until the canvas is garbage collected. Browsers cap concurrent
        // contexts (~16, fewer on mobile), so release it deterministically.
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Fullscreen fragment-shader visual. The fragment source gets a standard
// header prepended: uTime/uRes/uIntensity, palette colors uC1/uC2/uC3/uBg,
// and hash/noise/fbm/rot2 helpers. Palettes must provide {c1,c2,c3,bg}.
// ---------------------------------------------------------------------------
export const SHADER_HEADER = `precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uIntensity;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uBg;
uniform vec2 uPointer; uniform vec2 uPointerVelocity;
uniform float uPointerDown; uniform float uPointerAge; uniform float uPointerEnergy;
varying vec2 vUvRaw;
float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}
vec2 hash22(vec2 p){float n=sin(dot(p,vec2(41.0,289.0)));return fract(vec2(262144.0,32768.0)*n);}
float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
 float a=hash21(i);float b=hash21(i+vec2(1.0,0.0));float c=hash21(i+vec2(0.0,1.0));float d=hash21(i+vec2(1.0,1.0));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.03+vec2(17.3,9.1);a*=0.5;}return v;}
mat2 rot2(float a){float c=cos(a);float s=sin(a);return mat2(c,-s,s,c);}
vec2 interactiveUv(vec2 uv){
 return uv;
}
#define vUv interactiveUv(vUvRaw)
`

const FULLSCREEN_VERT = `varying vec2 vUvRaw;
void main(){ vUvRaw = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export function shaderVisual(
  container,
  opts = {},
  meta = {},
  frag,
  extraUniforms = {},
) {
  const v = threeVisual(container, opts, meta, { interactionMode: 'shader' })
  const uniforms = {
    uTime: { value: 0 },
    uRes: {
      value: new THREE.Vector2(
        Math.max(1, container.clientWidth),
        Math.max(1, container.clientHeight),
      ),
    },
    uIntensity: { value: v.state.intensity },
    uC1: { value: new THREE.Color('#ffffff') },
    uC2: { value: new THREE.Color('#888888') },
    uC3: { value: new THREE.Color('#444444') },
    uBg: { value: new THREE.Color('#000000') },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerVelocity: { value: new THREE.Vector2() },
    uPointerDown: { value: 0 },
    uPointerAge: { value: 99 },
    uPointerEnergy: { value: 0 },
    ...extraUniforms,
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: SHADER_HEADER + frag,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  quad.frustumCulled = false
  v.scene.add(quad)

  v.onPalette((p) => {
    if (p.c1) uniforms.uC1.value.set(p.c1)
    if (p.c2) uniforms.uC2.value.set(p.c2)
    if (p.c3) uniforms.uC3.value.set(p.c3)
    if (p.bg) uniforms.uBg.value.set(p.bg)
  })
  v.onFrame((dt, t, state) => {
    uniforms.uTime.value = t
    uniforms.uIntensity.value = state.intensity
    uniforms.uPointer.value.set(v.pointer.u, v.pointer.v)
    uniforms.uPointerVelocity.value.set(
      THREE.MathUtils.clamp(
        v.pointer.vx / Math.max(1, container.clientWidth),
        -2,
        2,
      ),
      THREE.MathUtils.clamp(
        -v.pointer.vy / Math.max(1, container.clientHeight),
        -2,
        2,
      ),
    )
    uniforms.uPointerDown.value = v.pointer.down ? 1 : 0
    uniforms.uPointerAge.value = v.pointer.pulseAge
    uniforms.uPointerEnergy.value = v.pointer.energy
  })
  v.onResize((w, h) => uniforms.uRes.value.set(w, h))

  return { ...v, uniforms, material: mat }
}

// ---------------------------------------------------------------------------
// 2D canvas visual. onFrame callbacks receive (ctx, dt, t, state, w, h) in
// CSS pixels (DPR handled by the kit).
// ---------------------------------------------------------------------------
export function canvasVisual(container, opts = {}, meta = {}) {
  const state = {
    speed: opts.speed ?? 1,
    intensity: opts.intensity ?? 1,
    paused: opts.paused ?? false,
    palette: meta.palettes?.[0] ?? null,
    t: 0,
  }
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  container.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const size = { w: 1, h: 1 }
  let previousDpr = 0

  const frameCbs = []
  const paletteCbs = []
  const resizeCbs = []
  const resetCbs = []
  const disposers = []
  const interaction = createInteraction(container, canvas, meta)
  interaction.on(() => {
    state.dirty = true
  })
  state.pointer = interaction.state

  function doResize() {
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      state.quality === 'low' ? 1 : state.quality === 'high' ? 2 : 1.5,
    )
    const nextW = Math.max(1, container.clientWidth),
      nextH = Math.max(1, container.clientHeight)
    if (nextW === size.w && nextH === size.h && dpr === previousDpr) return
    const oldW = size.w,
      oldH = size.h
    const snapshot = document.createElement('canvas')
    snapshot.width = canvas.width
    snapshot.height = canvas.height
    if (canvas.width) snapshot.getContext('2d').drawImage(canvas, 0, 0)
    size.w = nextW
    size.h = nextH
    previousDpr = dpr
    canvas.width = Math.round(size.w * dpr)
    canvas.height = Math.round(size.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (snapshot.width) ctx.drawImage(snapshot, 0, 0, size.w, size.h)
    state.dirty = true
    resizeCbs.forEach((cb) => cb(size.w, size.h, oldW, oldH))
  }
  doResize()

  const applyPalette = (i) => {
    state.palette = meta.palettes[i]
    paletteCbs.forEach((cb) => cb(state.palette))
  }
  const controls = buildPanel(container, meta, state, applyPalette, () => {
    state.t = 0
    resetCbs.forEach((cb) => cb())
    state.dirty = true
  })
  const { panel, setPaused, addAction, addSlider } = controls

  let rafId
  let last = performance.now()
  function tick(now) {
    rafId = requestAnimationFrame(tick)
    // The rAF timestamp is the frame's start time, which can predate the
    // performance.now() taken in start() — clamp so dt is never negative.
    const raw = Math.max(0, Math.min((now - last) / 1000, 0.05))
    last = now
    interaction.step(raw)
    if (state.paused && !state.dirty && !state.capture) return
    const dt = state.paused
      ? 0
      : raw * state.speed * (state.reducedMotion ? 0.45 : 1)
    state.dirty = false
    state.t += dt
    frameCbs.forEach((cb) => cb(ctx, dt, state.t, state, size.w, size.h))
    const interactionColor =
      state.palette?.shine ??
      state.palette?.glow ??
      state.palette?.accent ??
      state.palette?.c1 ??
      '#ffffff'
    interaction.drawCanvas(ctx, raw, interactionColor)
    if (state.capture) {
      const capture = state.capture
      state.capture = null
      capture()
    }
  }

  const resizeObserver = new ResizeObserver(doResize)
  window.addEventListener('comfort-change', doResize)
  disposers.push(() => window.removeEventListener('comfort-change', doResize))
  resizeObserver.observe(container)
  window.addEventListener('resize', doResize)
  let backgroundPaused = false
  const onVis = () => {
    if (document.hidden) {
      backgroundPaused = !state.paused
      if (backgroundPaused) setPaused(true)
    } else if (backgroundPaused) {
      backgroundPaused = false
      setPaused(false)
    }
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    canvas,
    ctx,
    state,
    size,
    addAction,
    addSlider,
    pointer: interaction.state,
    onPointer: interaction.on,
    burst: interaction.burst,
    onFrame: (cb) => frameCbs.push(cb),
    onPalette: (cb) => {
      paletteCbs.push(cb)
      if (state.palette) cb(state.palette)
    },
    onResize: (cb) => resizeCbs.push(cb),
    onReset: (cb) => resetCbs.push(cb),
    addDispose: (fn) => disposers.push(fn),
    start() {
      last = performance.now()
      rafId = requestAnimationFrame(tick)
      return () => {
        cancelAnimationFrame(rafId)
        resizeObserver.disconnect()
        window.removeEventListener('resize', doResize)
        document.removeEventListener('visibilitychange', onVis)
        interaction.dispose()
        controls.dispose()
        disposers.forEach((f) => f())
        canvas.remove()
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Small helpers shared by many visuals.
// ---------------------------------------------------------------------------

// Radial-gradient sprite texture (glows, bokeh, soft particles).
export function radialTexture(stops, size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  for (const [off, col] of stops) grad.addColorStop(off, col)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// Deterministic 2D gradient noise in [-1, 1] for JS-side fields.
export function makeNoise2D(seed = 1) {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let s = Math.floor(seed * 65537) + 1
  for (let i = 255; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = s % (i + 1)
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const grad = (h, x, y) => {
    switch (h & 3) {
      case 0:
        return x + y
      case 1:
        return -x + y
      case 2:
        return x - y
      default:
        return -x - y
    }
  }
  const lerp = (a, b, t) => a + (b - a) * t
  return (x, y) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = fade(x)
    const v = fade(y)
    const aa = perm[X + perm[Y]]
    const ab = perm[X + perm[Y + 1]]
    const ba = perm[X + 1 + perm[Y]]
    const bb = perm[X + 1 + perm[Y + 1]]
    return lerp(
      lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
      lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
      v,
    )
  }
}
