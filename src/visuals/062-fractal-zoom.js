import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '062-fractal-zoom',
  title: 'Fractal Zoom (Mandelbrot/Julia)',
  interaction: 'Move to lens the fractal · hold and drag space itself',
  palettes: [
    { name: 'Electric Deep', c1: '#4a9cf7', c2: '#ffd166', c3: '#0a1030', bg: '#04060f' },
    { name: 'Emerald Fire', c1: '#3fd88a', c2: '#ff8a3c', c3: '#0a2018', bg: '#040e08' },
    { name: 'Royal Plasma', c1: '#c084fc', c2: '#f472b6', c3: '#180a30', bg: '#08040f' },
  ],
}

// Julia set whose c-parameter orbits the Mandelbrot cardioid boundary —
// endlessly morphing dendrites — with gentle breathing zoom.
const FRAG = `
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  float t = uTime * 0.05;
  // Breathing zoom + slow rotation
  float zoom = 1.35 + 0.55 * sin(uTime * 0.03);
  vec2 p = rot2(uTime * 0.01) * uv * zoom;

  // c orbits just outside the main cardioid — the richest Julia shapes.
  float ca = t;
  vec2 c = vec2(
    0.7885 * cos(ca) * 0.5 - 0.25,
    0.7885 * sin(ca) * 0.5
  );

  vec2 z = p;
  float m = 0.0;
  float iter = 0.0;
  const float MAX_IT = 110.0;
  for (float i = 0.0; i < MAX_IT; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m = dot(z, z);
    if (m > 64.0) break;
    iter++;
  }

  vec3 col;
  if (iter >= MAX_IT - 1.0) {
    // Interior: deep velvety core with a faint pulse
    col = uC3 * (0.5 + 0.3 * sin(uTime * 0.5));
  } else {
    // Smooth escape-time coloring
    float sm = iter - log2(log2(m)) + 4.0;
    float f = sm / MAX_IT;
    // Two-tone cosine palette between the accent colors
    float band = 0.5 + 0.5 * cos(sm * 0.35 + uTime * 0.2);
    col = mix(uC3, uC1, smoothstep(0.0, 0.4, f));
    col = mix(col, uC2, band * smoothstep(0.05, 0.5, f));
    col += vec3(1.0) * pow(f, 3.0) * 1.4;
    col *= 0.5 + uIntensity * 0.65;
  }

  float vig = 1.0 - 0.3 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
