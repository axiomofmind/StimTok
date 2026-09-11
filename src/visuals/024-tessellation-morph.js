import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '024-tessellation-morph',
  title: 'Escher-Style Tessellation Morph',
  interaction: 'Move to flex the tessellation · press to distort it',
  palettes: [
    { name: 'Woodcut', c1: '#e8dcc8', c2: '#8a7a5f', c3: '#3a3020', bg: '#181410' },
    { name: 'Azulejo', c1: '#d8e8f0', c2: '#4a90c2', c3: '#1a3a5c', bg: '#0a1420' },
    { name: 'Ember Tile', c1: '#ffd9a0', c2: '#c2603a', c3: '#5c2018', bg: '#160a08' },
  ],
}

const FRAG = `
// Hexagonal grid helpers
vec4 hexGrid(vec2 p) {
  vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw)
    ? vec4(h.xy, hc.xy)
    : vec4(h.zw, hc.zw + 0.5);
}
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = uv * 7.0;
  p = rot2(uTime * 0.04) * p;

  vec4 hg = hexGrid(p);
  vec2 lp = hg.xy;        // local position in cell
  vec2 id = hg.zw;        // cell id

  // Each cell morphs between hexagon, circle, and star shapes in a wave
  // sweeping across the grid.
  float wave = sin(uTime * 0.6 - length(id) * 0.7 + hash21(id) * 0.8);
  float m = wave * 0.5 + 0.5;

  float dHex = hexDist(lp) - 0.42;
  float dCircle = length(lp) - 0.4;
  float ang = atan(lp.y, lp.x);
  float dStar = length(lp) - (0.32 + 0.1 * cos(ang * 6.0 + uTime * 0.3));

  // Two-stage morph
  float d = m < 0.5 ? mix(dHex, dCircle, m * 2.0) : mix(dCircle, dStar, (m - 0.5) * 2.0);

  float shape = smoothstep(0.02, -0.02, d);
  float edge = smoothstep(0.05, 0.015, abs(d));

  // Checker-ish coloring by cell parity so figure/ground interlock reads.
  float parity = mod(id.x + id.y * 2.0, 3.0);
  vec3 fill = parity < 1.0 ? uC1 : (parity < 2.0 ? uC2 : uC3);
  vec3 ground = parity < 1.0 ? uC3 : (parity < 2.0 ? uC1 * 0.4 : uC2 * 0.4);

  vec3 col = mix(uBg, ground, 0.6);
  col = mix(col, fill, shape);
  col += vec3(1.0) * edge * 0.12 * (0.5 + uIntensity);
  // subtle inner shading gives the tiles depth
  col *= 1.0 - 0.25 * smoothstep(-0.3, 0.0, d) * shape;

  float vig = 1.0 - 0.4 * dot(uv, uv);
  gl_FragColor = vec4(col * vig * (0.7 + uIntensity * 0.4), 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
