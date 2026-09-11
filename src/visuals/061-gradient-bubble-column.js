import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '061-gradient-bubble-column',
  title: 'Color-Gradient Bubble Column',
  interaction: 'Move through the column to bend bubbles · tap for a wave',
  palettes: [
    { name: 'Sunset Rise', c1: '#ff6b9d', c2: '#ffc145', c3: '#4a2a6a', bg: '#160a20' },
    { name: 'Deep Reef', c1: '#3fd8c0', c2: '#4a9cf7', c3: '#0a2a4a', bg: '#04101e' },
    { name: 'Violet Fizz', c1: '#c084fc', c2: '#f0abfc', c3: '#2a1a4a', bg: '#0e061c' },
  ],
}

// A full-screen wall of rising bubbles in three parallax layers, colored by
// height through the palette gradient.
const FRAG = `
// One bubble layer; returns (mask, highlight)
vec2 layer(vec2 uv, float t, float scale, float speed) {
  vec2 g = vec2(uv.x * scale, uv.y * scale * 0.8 - t * speed);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float seed = hash21(id);
  // Not every cell holds a bubble
  if (seed < 0.35) return vec2(0.0);
  vec2 off = (hash22(id) - 0.5) * 0.5;
  off.x += sin(t * (1.0 + seed) + seed * 20.0) * 0.12; // wobble
  float r = 0.10 + seed * 0.16;
  float d = length(f - off);
  float mask = smoothstep(r, r - 0.03, d);
  // ring look: hollow center
  float ringMask = mask * smoothstep(r - 0.09, r - 0.03, d);
  // highlight dot upper-left
  float hl = smoothstep(0.05, 0.0, length(f - off - vec2(-r * 0.4, r * 0.4)));
  return vec2(ringMask + mask * 0.15, hl * mask);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.35;

  // Height gradient background
  vec3 col = mix(uC3, uBg, smoothstep(0.0, 1.0, uv.y));
  col = mix(col, uC3 * 1.3, exp(-uv.y * 2.5) * 0.5);

  // Gradient color by height for the bubbles themselves
  vec3 bubbleCol = mix(uC1, uC2, smoothstep(0.1, 0.9, uv.y));

  vec2 l1 = layer(p, t, 5.0, 0.5);
  vec2 l2 = layer(p + 13.7, t, 8.0, 0.75);
  vec2 l3 = layer(p + 41.3, t, 13.0, 1.05);

  float amt = 0.5 + uIntensity * 0.6;
  col += bubbleCol * l1.x * 0.85 * amt;
  col += bubbleCol * l2.x * 0.55 * amt;
  col += bubbleCol * l3.x * 0.3 * amt;
  col += vec3(1.0) * (l1.y * 0.7 + l2.y * 0.4 + l3.y * 0.2) * amt;

  // Soft shafts of light through the column
  float shaft = exp(-pow((uv.x - 0.35 - sin(uTime * 0.1) * 0.1) * 5.0, 2.0));
  col += uC2 * shaft * 0.08 * uIntensity;

  float vig = 1.0 - 0.3 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
