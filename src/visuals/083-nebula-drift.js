import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '083-nebula-drift',
  title: 'Nebula Cloud Drift',
  interaction: 'Move through the nebula to shape its gases · press to stir',
  palettes: [
    { name: 'Orion', c1: '#ff4d6d', c2: '#4a9cf7', c3: '#ffd166', bg: '#03030c' },
    { name: 'Emerald Veil', c1: '#3fd88a', c2: '#4a6af7', c3: '#a0ffd8', bg: '#02080a' },
    { name: 'Rose Nebula', c1: '#ff8ad0', c2: '#8a5cff', c3: '#ffd8f0', bg: '#06030c' },
  ],
}

// Volumetric-looking nebula: several fbm layers at different scales and
// drift rates, colored by density and lit from embedded "stars".
const FRAG = `
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  float t = uTime * 0.02;

  vec2 p = uv * 1.6;
  // Large slow rotation gives the whole cloud a sense of mass.
  p = rot2(t * 0.4) * p;

  // Domain-warped density field.
  vec2 q = vec2(fbm(p * 1.1 + t), fbm(p * 1.1 + vec2(4.2, 1.7) - t * 0.6));
  vec2 r = vec2(fbm(p * 1.6 + 2.2 * q + t * 0.5), fbm(p * 1.6 + 2.2 * q + vec2(8.3, 2.8)));
  float density = fbm(p * 1.3 + 2.4 * r);

  // Separate the cloud into emission layers with different colors.
  float coreD = smoothstep(0.52, 0.85, density);
  float midD = smoothstep(0.40, 0.70, density);
  float outerD = smoothstep(0.28, 0.62, density);

  vec3 col = uBg;
  col += uC2 * outerD * 0.35;
  col += uC1 * midD * 0.55;
  col += uC3 * coreD * 0.75;

  // Dark dust lanes: a second field that subtracts.
  float dust = smoothstep(0.45, 0.7, fbm(p * 2.4 + r * 1.5 + 30.0));
  col *= 1.0 - dust * 0.55;

  // Embedded bright stars illuminating nearby gas.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 sp = (hash22(vec2(fi * 3.1, 7.7)) - 0.5) * 1.6;
    float d = length(p - sp);
    float star = exp(-d * 26.0);
    float bloom = exp(-d * 4.5);
    vec3 sc = mix(uC3, vec3(1.0), 0.6);
    col += sc * star * 1.6;
    col += mix(uC1, uC3, hash21(vec2(fi, 2.0))) * bloom * 0.28 * midD;
  }

  // Fine background starfield
  vec2 sg = uv * 90.0;
  float sh = hash21(floor(sg));
  float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + sh * 40.0);
  col += vec3(1.0) * step(0.9965, sh) * twinkle * 0.9;

  col *= 0.6 + uIntensity * 0.6;
  float vig = 1.0 - 0.35 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
