import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '095-led-panel-wash',
  title: 'Color-Changing LED Panel Wash',
  interaction: 'Move across the LEDs to bend their wash · tap for a pulse',
  palettes: [
    { name: 'Full Cycle', c1: '#ff2975', c2: '#00d9ff', c3: '#a8ff5f', bg: '#050508' },
    { name: 'Warm Wash', c1: '#ff8a2e', c2: '#ffd166', c3: '#ff5d8f', bg: '#080503' },
    { name: 'Cool Wash', c1: '#4a9cf7', c2: '#a855f7', c3: '#3fd8c0', bg: '#03050a' },
  ],
}

// A grid of soft LED cells that cross-fade through the palette in slow
// travelling waves — the calm "light panel" look, no strobing.
const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime * 0.16;

  // Panel grid
  float cells = 9.0;
  vec2 g = vec2(p.x * cells / aspect, p.y * cells) * vec2(aspect, 1.0);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;

  // Each cell's phase depends on its position, so color sweeps diagonally
  // across the panel rather than all cells changing at once.
  float phase = t + (id.x * 0.16 + id.y * 0.21);
  // Add a slow radial wave for a second layer of motion.
  phase += sin(length(id - cells * 0.5) * 0.4 - t * 1.6) * 0.28;

  // Three-way smooth color blend.
  float w1 = 0.5 + 0.5 * sin(phase * 6.2831);
  float w2 = 0.5 + 0.5 * sin(phase * 6.2831 + 2.094);
  float w3 = 0.5 + 0.5 * sin(phase * 6.2831 + 4.188);
  float wsum = w1 + w2 + w3;
  vec3 cellCol = (uC1 * w1 + uC2 * w2 + uC3 * w3) / wsum;

  // Soft rounded diffuser per cell — bright center, dark seams.
  float d = max(abs(f.x), abs(f.y));
  float diffuse = smoothstep(0.5, 0.12, d);
  float seam = smoothstep(0.44, 0.5, d);

  // Individual cell brightness also breathes gently.
  float breathe = 0.72 + 0.28 * sin(phase * 6.2831 * 0.5 + hash21(id) * 6.2831);

  vec3 col = uBg;
  col += cellCol * diffuse * breathe * (0.55 + uIntensity * 0.75);
  // Bloom between cells so the panel glows as a whole.
  col += cellCol * 0.16 * breathe;
  col *= 1.0 - seam * 0.55;

  // Faint overall glass reflection sweeping across.
  float sheen = exp(-pow((uv.x - 0.5 - sin(uTime * 0.08) * 0.45) * 3.0, 2.0));
  col += vec3(1.0) * sheen * 0.035;

  float vig = 1.0 - 0.28 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
