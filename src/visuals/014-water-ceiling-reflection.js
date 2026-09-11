import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '014-water-ceiling-reflection',
  title: 'Water-Light Ceiling Reflection',
  interaction: 'Move to refract the water-light · tap for a wave',
  palettes: [
    { name: 'Pool Party', c1: '#bfffff', c2: '#4fd8e8', c3: '#1a6a8a', bg: '#0a2a3a' },
    { name: 'Moonlit Bay', c1: '#d8e8ff', c2: '#7a9dd8', c3: '#2a3a6a', bg: '#0a1020' },
    { name: 'Emerald Grotto', c1: '#d8ffe8', c2: '#4fe8a8', c3: '#1a6a4a', bg: '#07231a' },
  ],
}

// Animated caustics: voronoi F1 distance over drifting cell points.
const FRAG = `
float caustic(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float m = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      o = 0.5 + 0.5 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      m = min(m, d);
    }
  }
  return m;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Whole pattern drifts and slowly swirls like water pushed by a breeze.
  vec2 q = p * 3.2;
  q = rot2(sin(uTime * 0.05) * 0.2) * q;
  q += vec2(uTime * 0.06, uTime * 0.025);

  float t = uTime * 0.7;
  float c1 = caustic(q, t);
  float c2 = caustic(q * 1.9 + 40.0, t * 1.3);

  // Sharpen the cell ridges into bright caustic filaments.
  float k1 = pow(1.0 - c1, 5.0);
  float k2 = pow(1.0 - c2, 6.0);
  float light = (k1 * 0.9 + k2 * 0.55) * (0.5 + uIntensity * 0.8);

  // Gentle large-scale swell brightening whole regions
  light *= 0.7 + 0.5 * fbm(p * 1.2 + uTime * 0.08);

  vec3 col = uBg;
  col = mix(col, uC3, 0.4 + 0.2 * fbm(p * 2.0));
  col += uC2 * light;
  col += uC1 * pow(light, 2.2) * 0.9;

  float vig = 1.0 - 0.4 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
