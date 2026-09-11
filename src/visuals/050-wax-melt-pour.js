import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '050-wax-melt-pour',
  title: 'Melting Wax Pour',
  interaction: 'Move through the hot wax to bend its flow · press to stir',
  palettes: [
    { name: 'Crimson Candle', c1: '#e8384a', c2: '#ff8a94', c3: '#8a1420', bg: '#160a0c' },
    { name: 'Honey Wax', c1: '#e8a838', c2: '#ffd98a', c3: '#8a5a14', bg: '#141006' },
    { name: 'Violet Drip', c1: '#9d6ae8', c2: '#cdb0ff', c3: '#4a2a8a', bg: '#0e0816' },
  ],
}

// Viscous drips running down over accumulated wax layers.
const FRAG = `
// One drip column: rounded tongue whose tip advances over time.
float drips(vec2 p, float t, float scale, float speed) {
  vec2 g = vec2(p.x * scale, p.y);
  float id = floor(g.x);
  float f = fract(g.x) - 0.5;
  float seed = hash21(vec2(id, scale));

  // Tip position loops: descends, holds, resets while others cover it.
  float phase = fract(t * speed * (0.4 + seed * 0.6) + seed);
  float tip = 1.15 - phase * 1.35;

  // Tongue profile: wide near the top, rounded at the tip.
  float widthBase = 0.24 + seed * 0.18;
  float aboveTip = smoothstep(tip, tip + 0.55, p.y);
  float width = widthBase * aboveTip * (1.0 + 0.2 * sin(p.y * 9.0 + seed * 20.0));
  float body = smoothstep(width, width - 0.09, abs(f) / 1.0);
  // Round the tip
  float tipCap = smoothstep(0.16, 0.0, length(vec2(f * 0.75, (p.y - tip) * scale * 0.35)) - widthBase * 0.35);
  return max(body * aboveTip, tipCap);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect + 0.5, uv.y);
  float t = uTime * 0.14;

  // Background: candle body with soft vertical shading
  vec3 col = mix(uBg, uC3 * 0.5, smoothstep(0.0, 1.0, uv.y) * 0.4);

  // Three generations of drips: old dark, mid, fresh glossy.
  float old = drips(p + vec2(0.13, 0.0), t * 0.5 + 3.0, 5.0, 0.5);
  float mid = drips(p + vec2(0.29, 0.0), t * 0.8 + 7.0, 6.0, 0.75);
  float fresh = drips(p, t, 4.0, 1.0);

  col = mix(col, uC3, old * 0.9);
  col = mix(col, uC1, mid * 0.95);
  col = mix(col, mix(uC1, uC2, 0.5), fresh);

  // Glossy highlight running down the center of fresh drips
  float gl = drips(p + vec2(0.02, 0.0), t, 4.0, 1.0) - drips(p + vec2(0.06, 0.0), t, 4.0, 1.0);
  col += uC2 * clamp(gl, 0.0, 1.0) * (0.5 + uIntensity * 0.5);

  // Molten pool glow at the top where wax is liquid
  float poolGlow = smoothstep(0.8, 1.0, uv.y);
  col += uC2 * poolGlow * (0.25 + 0.1 * sin(uTime * 1.2)) * uIntensity;

  // Soft sheen sweep
  float sheen = exp(-pow((uv.x - 0.5 - sin(uTime * 0.2) * 0.3) * 4.0, 2.0));
  col += vec3(1.0) * sheen * 0.06;

  float vig = 1.0 - 0.35 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
