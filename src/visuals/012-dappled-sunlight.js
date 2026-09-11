import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '012-dappled-sunlight',
  title: 'Sunlight Dappled Through Leaves',
  interaction: 'Move through the sunlight · press to ripple the canopy',
  palettes: [
    { name: 'Summer Canopy', c1: '#ffe8b0', c2: '#a8d878', c3: '#2d5016', bg: '#1a2e0d' },
    { name: 'Autumn', c1: '#ffd9a0', c2: '#e8a852', c3: '#6b3a1a', bg: '#2a1a0d' },
    { name: 'Forest Floor', c1: '#d8f0c8', c2: '#5a9e6f', c3: '#1a3a2a', bg: '#0d1f14' },
  ],
}

const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y) * 3.0;

  // Two canopy layers swaying at different rates — wind through leaves.
  vec2 wind1 = vec2(sin(uTime * 0.4) * 0.15 + uTime * 0.02, cos(uTime * 0.33) * 0.1);
  vec2 wind2 = vec2(sin(uTime * 0.27 + 2.0) * 0.2, uTime * 0.015);

  float canopy1 = fbm(p * 1.4 + wind1);
  float canopy2 = fbm(p * 2.6 + wind2 + 40.0);

  // Sun spots appear where both layers open up.
  float open1 = smoothstep(0.48, 0.72, canopy1);
  float open2 = smoothstep(0.42, 0.68, canopy2);
  float sun = open1 * open2;

  // Soft halo around each spot
  float halo = smoothstep(0.35, 0.72, canopy1) * smoothstep(0.3, 0.68, canopy2);

  float bright = (sun * 1.2 + halo * 0.35) * (0.5 + uIntensity * 0.75);

  // Shimmer: tiny flicker as leaves flutter
  bright *= 0.85 + 0.15 * vnoise(p * 8.0 + uTime * 1.2);

  vec3 ground = mix(uBg, uC3, fbm(p * 3.0 + 10.0) * 0.6);
  vec3 col = ground;
  col = mix(col, uC2, halo * 0.4);
  col += uC1 * bright;

  float vig = 1.0 - 0.35 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
