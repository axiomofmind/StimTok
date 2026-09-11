import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '020-moire-pattern',
  title: 'Moire Pattern Interference',
  interaction: 'Move to bend the interference field · press to twist it',
  palettes: [
    { name: 'Ink on Paper', c1: '#e8e4da', c2: '#8a8478', c3: '#3a362e', bg: '#12100c' },
    { name: 'Cyan Field', c1: '#7df9ff', c2: '#2a9db0', c3: '#0d4a58', bg: '#04141a' },
    { name: 'Magenta Haze', c1: '#ff9de2', c2: '#b05fa8', c3: '#58204a', bg: '#160518' },
  ],
}

const FRAG = `
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  // Two ring systems whose centers orbit each other very slowly.
  float t = uTime * 0.12;
  vec2 cA = vec2(cos(t) * 0.16, sin(t * 0.8) * 0.12);
  vec2 cB = -cA + vec2(sin(t * 0.6) * 0.05, 0.0);

  float freq = 90.0 + sin(uTime * 0.07) * 25.0;
  float rA = length(uv - cA);
  float rB = length(uv - cB);

  float wavesA = sin(rA * freq);
  float wavesB = sin(rB * (freq * 1.015));

  // Interference: the product creates large slow moire fringes.
  float moire = wavesA * wavesB;
  float fringe = smoothstep(-0.2, 0.6, moire);

  // A third, angular line set adds drifting linear moire.
  float lines = sin((uv.x * cos(t * 0.5) + uv.y * sin(t * 0.5)) * freq * 0.6);
  float fringe2 = smoothstep(0.0, 0.8, moire * lines);

  vec3 col = uBg;
  col = mix(col, uC3, fringe * 0.7);
  col = mix(col, uC2, fringe2 * 0.8);
  col = mix(col, uC1, pow(fringe * fringe2, 2.0) * (0.6 + uIntensity * 0.6));

  // Soft breathing brightness
  col *= 0.85 + 0.15 * sin(uTime * 0.4);
  float vig = 1.0 - 0.5 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
