import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '035-cloud-drift',
  title: 'Slow Cloud Drift Timelapse',
  interaction: 'Move to reshape the cloud layer · press to stir it',
  palettes: [
    { name: 'Blue Sky Day', c1: '#ffffff', c2: '#c8ddf0', c3: '#7ab8e8', bg: '#4a9de0' },
    { name: 'Sunset Layers', c1: '#ffe0c0', c2: '#f0a878', c3: '#c05878', bg: '#5a2a52' },
    { name: 'Night Moon', c1: '#c8d4e8', c2: '#6a7a9a', c3: '#2a3450', bg: '#0d1424' },
  ],
}

const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Sky gradient
  vec3 col = mix(uC3, uBg, uv.y);

  // Two cloud decks drifting at different speeds (parallax timelapse).
  float t = uTime;
  vec2 drift1 = vec2(t * 0.03, t * 0.004);
  vec2 drift2 = vec2(t * 0.055, -t * 0.006);

  // y-squashed fbm gives flat-bottomed cumulus shapes
  vec2 q1 = vec2(p.x * 1.2, p.y * 2.6) + drift1;
  float d1 = fbm(q1 + fbm(q1 * 1.8) * 0.4);
  float deck1 = smoothstep(0.45, 0.72, d1);

  vec2 q2 = vec2(p.x * 2.2, p.y * 4.2) + drift2 + 30.0;
  float d2 = fbm(q2 + fbm(q2 * 1.6) * 0.35);
  float deck2 = smoothstep(0.5, 0.78, d2);

  // Cloud shading: lit tops, shaded bases (sample slightly above).
  float lit1 = fbm(q1 + vec2(0.0, 0.12) + fbm(q1 * 1.8) * 0.4);
  float shade1 = clamp((lit1 - d1) * 5.0 + 0.6, 0.0, 1.0);
  float lit2 = fbm(q2 + vec2(0.0, 0.12) + fbm(q2 * 1.6) * 0.35 + 30.0);
  float shade2 = clamp((lit2 - d2) * 5.0 + 0.6, 0.0, 1.0);

  float amount = 0.6 + uIntensity * 0.5;
  col = mix(col, mix(uC2, uC1, shade1), deck1 * 0.9 * amount);
  col = mix(col, mix(uC2 * 0.9, uC1, shade2), deck2 * 0.95 * amount);

  // Sun/moon glow upper-right
  float sun = exp(-length((uv - vec2(0.78, 0.8)) * vec2(aspect, 1.0)) * 3.5);
  col += uC1 * sun * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
