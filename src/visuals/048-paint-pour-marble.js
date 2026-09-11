import { THREE, shaderVisual } from '../lib/visual-kit.js'
import { ORGANIC_NOISE } from '../lib/organic-noise.js'

export const meta = {
  id: '048-paint-pour-marble',
  title: 'Paint-Pouring Marbling Swirl',
  interaction:
    'Pour: hold to add color rings · Comb: drag to rake the paint · Tilt: drag to set the flow',
  palettes: [
    {
      name: 'Gallery Pour',
      c1: '#0f4c81',
      c2: '#f2c230',
      c3: '#e8e4da',
      bg: '#d1342f',
    },
    {
      name: 'Rose Marble',
      c1: '#831843',
      c2: '#fbcfe8',
      c3: '#f5d0a9',
      bg: '#4c1d95',
    },
    {
      name: 'Terra Flow',
      c1: '#7c2d12',
      c2: '#fdba74',
      c3: '#fef3c7',
      bg: '#166534',
    },
  ],
}

// Marbled paint-pour "cells": concentric color bands warped by slow flow,
// with the characteristic combed swirl and cell lacing.
const FRAG = `
${ORGANIC_NOISE}
uniform vec2 uPour;
uniform vec2 uOffset;
uniform float uAmount;
uniform float uLacing;
uniform float uBands;
uniform vec4 uStrokes[24];
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = uv * 2.0 + uOffset;
  float t = uTime * 0.05;

  // Slow rotational pour flow around a drifting center
  vec2 c = uPour;
  for (int i = 0; i < 24; i++) {
    vec4 s = uStrokes[i];
    vec2 delta = p - s.xy;
    float falloff = exp(-dot(delta, delta) * 12.0);
    float teeth = 0.55 + 0.45 * cos(dot(delta, vec2(-s.w, s.z)) / max(length(s.zw), 0.001) * 95.0);
    p -= s.zw * falloff * teeth;
  }
  vec2 d = p - c;
  float r = length(d);
  float swirl = 1.2 / (1.0 + r * r * 2.0);
  p = c + rot2(swirl * sin(t * 3.0) * 2.5) * d;

  // Domain warp for the liquid lacing
  vec2 q = vec2(organicFbm(p * 1.5 + t * 2.0), organicFbm(p * 1.5 + 5.0 - t * 1.4));
  p += (q - 0.5) * (0.8 + uIntensity * 0.4);

  // Concentric pour rings expanding slowly from the pour point
  float rings = fract(length(p - c) * uBands - t * 0.5 - uAmount);

  // Map ring phase to the 4 palette colors with hard-ish liquid edges
  vec3 col;
  if (rings < 0.25) col = mix(uC1, uC2, smoothstep(0.2, 0.25, rings) );
  else if (rings < 0.5) col = mix(uC2, uC3, smoothstep(0.45, 0.5, rings));
  else if (rings < 0.75) col = mix(uC3, uBg, smoothstep(0.7, 0.75, rings));
  else col = mix(uBg, uC1, smoothstep(0.95, 1.0, rings));

  // Cell lacing: fine bright web where flow stretches the paint
  float lace = smoothstep(0.45, 0.5, abs(fract(q.x * 8.0) - 0.5));
  col = mix(col, uC3, lace * 0.25 * uLacing);

  // Silicone-oil cells: small popping dots of the base color
  vec2 cell = fract(p * 7.0) - 0.5;
  float cd = length(cell + (hash22(floor(p * 7.0)) - 0.5) * 0.4);
  float cells = (1.0 - smoothstep(0.08, 0.12, cd)) * step(0.75, hash21(floor(p * 7.0)));
  col = mix(col, uC2, cells * 0.7 * uLacing);

  // Glossy wet sheen
  float sheen = pow(max(0.0, organicFbm(p * 2.0 - t * 3.0) - 0.4), 2.0) * 1.4;
  col += vec3(1.0) * sheen * 0.25;

  float vig = 1.0 - 0.25 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const strokes = Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0, 0))
  const pour = new THREE.Vector2(),
    offset = new THREE.Vector2(),
    tilt = new THREE.Vector2()
  let mode = 'Pour',
    next = 0,
    amount = 0
  const v = shaderVisual(container, opts, meta, FRAG, {
    uPour: { value: pour },
    uOffset: { value: offset },
    uAmount: { value: 0 },
    uLacing: { value: 1 },
    uBands: { value: 2.2 },
    uStrokes: { value: strokes },
  })
  const bar = document.createElement('div')
  bar.style.cssText =
    'position:absolute;top:18px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3'
  const buttons = []
  for (const name of ['Pour', 'Comb', 'Tilt']) {
    const button = document.createElement('button')
    button.textContent = name
    button.style.cssText =
      'border:1px solid #ffffff66;border-radius:22px;padding:10px 16px;color:white;background:#14251fe8;font:600 14px system-ui;cursor:pointer;touch-action:manipulation'
    button.onclick = () => {
      mode = name
      buttons.forEach((b) => {
        b.setAttribute('aria-pressed', String(b === button))
        b.style.background = b === button ? '#416850' : '#14251fe8'
      })
    }
    buttons.push(button)
    bar.append(button)
  }
  container.append(bar)
  buttons[0].click()
  v.addDispose(() => bar.remove())
  v.addSlider('Ring spacing', 'bands', 1, 5, 0.1, 2.2)
  v.addSlider('Cell lacing', 'lacing', 0, 1.4, 0.05, 1)
  v.addAction('Level tray', () => tilt.set(0, 0))
  v.addAction('Clear comb marks', () =>
    strokes.forEach((s) => s.set(0, 0, 0, 0)),
  )
  v.onPointer((e) => {
    if (e.type !== 'down' && e.type !== 'drag') return
    const w = Math.max(1, container.clientWidth),
      h = Math.max(1, container.clientHeight)
    const x = (((e.u - 0.5) * w) / h) * 2 + offset.x,
      y = (e.v - 0.5) * 2 + offset.y
    if (mode === 'Pour') {
      pour.set(x, y)
      if (e.type === 'down') amount += 0.15
    }
    if (mode === 'Comb' && e.type === 'drag') {
      strokes[next++ % strokes.length].set(
        x,
        y,
        THREE.MathUtils.clamp((e.dx / h) * 5, -0.3, 0.3),
        THREE.MathUtils.clamp((-e.dy / h) * 5, -0.3, 0.3),
      )
    }
    if (mode === 'Tilt' && e.type === 'drag') {
      tilt.x = THREE.MathUtils.clamp(tilt.x + e.dx / w, -0.5, 0.5)
      tilt.y = THREE.MathUtils.clamp(tilt.y - e.dy / h, -0.5, 0.5)
      offset.addScaledVector(tilt, 0.025)
    }
  })
  v.onFrame((dt) => {
    if (v.pointer.down && mode === 'Pour') amount += dt * 0.7
    offset.addScaledVector(tilt, dt * 0.2)
    v.uniforms.uAmount.value = amount
    v.uniforms.uBands.value = v.state.bands
    v.uniforms.uLacing.value = v.state.lacing
  })
  return v.start()
}
