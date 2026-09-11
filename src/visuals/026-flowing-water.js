import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '026-flowing-water',
  title: 'Flowing Water / Gentle Waves',
  interaction: 'Drag through the water to stir it · tap for ripples',
  palettes: [
    { name: 'Mountain Stream', c1: '#d8f4ff', c2: '#4fa8d8', c3: '#1a4a6a', bg: '#0a2436' },
    { name: 'Tropical Shallows', c1: '#e8fff8', c2: '#3fd8c0', c3: '#0d6a5a', bg: '#04302a' },
    { name: 'Twilight River', c1: '#e0d8ff', c2: '#6a5fd8', c3: '#2a2060', bg: '#100a2e' },
  ],
}

const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Downstream flow: stretched noise advected along y with sideways meander.
  float t = uTime * 0.5;
  vec2 flow = vec2(sin(uv.y * 4.0 + t * 0.4) * 0.06, -t * 0.5);

  // Layered streamlines at different scales/speeds.
  float s1 = fbm(vec2(p.x * 5.0, p.y * 1.6) + flow * 1.0);
  float s2 = fbm(vec2(p.x * 9.0, p.y * 3.0) + flow * 1.7 + 20.0);
  float s3 = fbm(vec2(p.x * 16.0, p.y * 6.0) + flow * 2.6 + 50.0);

  // Surface height-ish field
  float surface = s1 * 0.55 + s2 * 0.3 + s3 * 0.15;

  // Depth gradient: darker mid-channel, lighter at banks (uv.x edges)
  float channel = smoothstep(0.0, 0.35, uv.x) * smoothstep(1.0, 0.65, uv.x);
  vec3 col = mix(uC3 * 0.6, uC3, 1.0 - channel * 0.6);
  col = mix(col, uC2, smoothstep(0.35, 0.75, surface));

  // Glints: sharp ridges of the fine noise catch the light.
  float glint = smoothstep(0.62, 0.72, s3) * smoothstep(0.5, 0.65, s2);
  col += uC1 * glint * (0.7 + uIntensity * 0.8);

  // Foam streaks near the banks
  float foam = smoothstep(0.55, 0.8, s2) * (1.0 - channel);
  col = mix(col, uC1, foam * 0.35);

  // Slow caustic shimmer under everything
  col += uC2 * 0.15 * sin(surface * 12.0 - uTime * 2.0) * channel;

  float vig = 1.0 - 0.35 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig * (0.7 + uIntensity * 0.4), 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
