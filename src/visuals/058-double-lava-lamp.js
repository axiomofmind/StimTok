import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '058-double-lava-lamp',
  title: 'Double Lava Lamp Color-Mix',
  interaction: 'Stir between the lamps to mix their flowing fields',
  palettes: [
    { name: 'Fire & Ice', c1: '#ff5d2e', c2: '#2e9dff', c3: '#1a0a2e', bg: '#08050f' },
    { name: 'Lime & Grape', c1: '#a8e02e', c2: '#b02ee8', c3: '#12200a', bg: '#060a04' },
    { name: 'Gold & Rose', c1: '#ffc12e', c2: '#ff2e8a', c3: '#2a1408', bg: '#0f0804' },
  ],
}

const N = 5

const FRAG = `
uniform vec4 uBlobsA[${N}];
uniform vec4 uBlobsB[${N}];

float fieldOf(vec2 p, vec4 b) {
  vec2 d = p - b.xy;
  float wob = 1.0 + 0.12 * sin(atan(d.y, d.x) * 3.0 + uTime * 0.6 + b.w * 6.2831);
  float r = b.z * wob;
  return (r * r) / (dot(d, d) + 1e-4);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = uv * 1.6;

  // Tall vessel mask
  float halfW = mix(0.42, 0.30, smoothstep(-0.7, 0.7, p.y));
  float vd = max(abs(p.x) - halfW, abs(p.y) - 0.7);
  float inside = smoothstep(0.008, -0.008, vd);

  float fa = 0.0;
  float fb = 0.0;
  for (int i = 0; i < ${N}; i++) {
    fa += fieldOf(p, uBlobsA[i]);
    fb += fieldOf(p, uBlobsB[i]);
  }
  float total = fa + fb;
  float surf = smoothstep(0.6, 0.78, total);
  float mixAmt = clamp(fb / max(total, 0.001), 0.0, 1.0);

  // Two wax colors; where fields overlap the colors truly blend.
  vec3 wax = mix(uC1, uC2, mixAmt);
  // The overlap zone glows brighter — the "mixing" moment.
  float overlap = 4.0 * (fa / max(total, 0.001)) * mixAmt;
  wax += vec3(1.0) * overlap * overlap * 0.22 * (0.5 + uIntensity * 0.75);
  float rim = smoothstep(0.6, 0.78, total) - smoothstep(0.9, 1.6, total);
  wax += mix(uC1, uC2, mixAmt) * rim * 0.5;

  vec3 liquid = uC3 * (0.8 + 0.5 * exp(-(p.y + 0.7) * 2.0));
  liquid += (uC1 + uC2) * 0.04 * smoothstep(0.35, 0.6, total);

  vec3 col = mix(liquid, wax, surf) * inside;

  // Glass sheen
  col += vec3(1.0) * exp(-pow((p.x + 0.2) * 12.0, 2.0)) * inside * 0.09;

  // Base/cap
  float capMask = step(0.7, abs(p.y)) * step(abs(p.y), 0.86) * step(abs(p.x), halfW + 0.06);
  vec3 metal = vec3(0.3, 0.29, 0.27) * (0.7 + 0.5 * exp(-pow(p.x * 6.0, 2.0)));
  metal += (uC1 + uC2) * 0.3 * capMask * exp(-(p.y + 0.86) * 3.0);
  col = mix(col, metal, capMask * (1.0 - inside));

  col += uBg * (1.0 - inside) * (1.0 - capMask);
  col += (uC1 + uC2) * 0.05 * exp(-max(vd, 0.0) * 4.0) * (1.0 - inside) * uIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`

function makeBlobs(count, side) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      x: (Math.random() - 0.5) * 0.4 + side * 0.1,
      y: -0.5 + Math.random() * 1.0,
      r: 0.1 + Math.random() * 0.1,
      heat: Math.random(),
      phase: Math.random(),
      vy: 0,
      side,
    })
  }
  return arr
}

export function mount(container, opts = {}) {
  const dataA = new Float32Array(N * 4)
  const dataB = new Float32Array(N * 4)
  const blobsA = makeBlobs(N, -1)
  const blobsB = makeBlobs(N, 1)

  const v = shaderVisual(container, opts, meta, FRAG, {
    uBlobsA: { value: dataA },
    uBlobsB: { value: dataB },
  })

  function step(blobs, data, dt, t, state, offset) {
    for (let i = 0; i < N; i++) {
      const b = blobs[i]
      if (b.y < -0.4) b.heat += dt * (0.11 + 0.05 * state.intensity)
      if (b.y > 0.35) b.heat -= dt * 0.09
      b.heat = Math.max(0, Math.min(1.2, b.heat))
      b.vy += (b.heat - 0.55) * 0.05 * dt * 2
      b.vy *= 0.985
      b.y += b.vy * dt * 3
      b.y = Math.max(-0.62, Math.min(0.62, b.y))
      b.x += Math.sin(t * 0.25 + b.phase * 6.28 + offset) * dt * 0.015
      const halfW = 0.42 + (0.3 - 0.42) * ((b.y + 0.7) / 1.4)
      b.x = Math.max(-halfW + b.r, Math.min(halfW - b.r, b.x))
      data[i * 4] = b.x
      data[i * 4 + 1] = b.y
      data[i * 4 + 2] = b.r
      data[i * 4 + 3] = b.phase
    }
  }

  v.onFrame((dt, t, state) => {
    step(blobsA, dataA, dt, t, state, 0)
    step(blobsB, dataB, dt, t, state, 2.5)
  })

  return v.start()
}
