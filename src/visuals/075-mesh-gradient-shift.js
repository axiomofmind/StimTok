import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '075-mesh-gradient-shift',
  title: 'Slow Color-Shift Mesh Gradient',
  interaction: 'Move through the gradient mesh to bend its color field',
  palettes: [
    { name: 'Dawn Mesh', c1: '#ff9a8b', c2: '#7dd3fc', c3: '#fde68a', bg: '#5a3a6a' },
    { name: 'Deep Mesh', c1: '#4a3aff', c2: '#00d9c0', c3: '#8a2be2', bg: '#0a0a2a' },
    { name: 'Sorbet', c1: '#ffb3c6', c2: '#a0e7e5', c3: '#fdf3b3', bg: '#e0b0d0' },
  ],
}

// Four color points drift on slow lissajous paths; each pixel is an
// inverse-distance-weighted blend of them — a true mesh gradient.
const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.13;

  vec2 pts[4];
  pts[0] = vec2(0.5 + 0.42 * sin(t * 0.9), 0.5 + 0.34 * cos(t * 0.7)) * vec2(aspect, 1.0);
  pts[1] = vec2(0.5 + 0.40 * sin(t * 0.6 + 2.1), 0.5 + 0.38 * cos(t * 1.1 + 1.3)) * vec2(aspect, 1.0);
  pts[2] = vec2(0.5 + 0.36 * sin(t * 1.2 + 4.2), 0.5 + 0.42 * cos(t * 0.5 + 3.7)) * vec2(aspect, 1.0);
  pts[3] = vec2(0.5 + 0.44 * sin(t * 0.4 + 5.6), 0.5 + 0.30 * cos(t * 0.85 + 0.6)) * vec2(aspect, 1.0);

  vec3 cols[4];
  cols[0] = uC1;
  cols[1] = uC2;
  cols[2] = uC3;
  cols[3] = uBg;

  // Soft warp so the blend boundaries breathe rather than staying circular.
  vec2 warp = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 + 10.0 - t)) - 0.5;
  vec2 sp = p + warp * 0.18;

  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    float d = distance(sp, pts[i]);
    // Falloff exponent controls how "meshy" vs "muddy" the blend looks.
    float w = 1.0 / pow(d + 0.06, 3.2);
    sum += cols[i] * w;
    wsum += w;
  }
  vec3 col = sum / wsum;

  // Gentle brightness undulation and a soft grain to avoid banding.
  col *= 0.88 + 0.12 * sin(uTime * 0.25);
  col *= 0.7 + uIntensity * 0.5;
  float grain = (hash21(uv * uRes + fract(uTime)) - 0.5) * 0.012;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
