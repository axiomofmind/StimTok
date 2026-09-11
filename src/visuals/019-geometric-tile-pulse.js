import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '019-geometric-tile-pulse',
  title: 'Geometric Tile Pattern',
  interaction: 'Move across the tiles to warp them · tap for a pulse',
  palettes: [
    { name: 'Terracotta', c1: '#e07a5f', c2: '#f2cc8f', c3: '#3d405b', bg: '#1a1420' },
    { name: 'Nordic', c1: '#8ecae6', c2: '#e8f0f2', c3: '#219ebc', bg: '#0c1820' },
    { name: 'Midnight Gold', c1: '#d4af37', c2: '#8a6d1f', c3: '#1f2937', bg: '#0a0d14' },
  ],
}

const FRAG = `
// Rounded-square SDF
float rbox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  float scale = 6.0;
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;

  // Pulse wave radiating from the center; each tile breathes in turn.
  float dist = length(id + 0.5) * 0.55;
  float pulse = sin(uTime * 1.4 - dist) * 0.5 + 0.5;
  float size = 0.28 + pulse * 0.14 * (0.5 + uIntensity * 0.75);

  // Alternate tiles rotate slowly in opposite directions.
  float dir = mod(id.x + id.y, 2.0) < 1.0 ? 1.0 : -1.0;
  vec2 fp = rot2(uTime * 0.25 * dir + pulse * 0.4) * f;

  float d = rbox(fp, vec2(size), 0.08);
  float tile = smoothstep(0.015, -0.015, d);
  float ring = smoothstep(0.05, 0.02, abs(d + 0.05));

  // inner diamond accent
  vec2 fp2 = rot2(0.785398) * fp;
  float d2 = rbox(fp2, vec2(size * 0.42), 0.03);
  float inner = smoothstep(0.012, -0.012, d2);

  // checker base tint
  float check = mod(id.x + id.y, 2.0);
  vec3 col = mix(uBg, uC3, 0.35 + check * 0.15);
  col = mix(col, mix(uC1, uC2, pulse), tile);
  col = mix(col, uC3, inner * 0.85);
  col += uC2 * ring * 0.4 * pulse;

  // soft grout shadow between tiles
  float grout = smoothstep(0.5, 0.42, max(abs(f.x), abs(f.y)));
  col *= 0.75 + 0.25 * grout;

  float vig = 1.0 - 0.35 * length(uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
