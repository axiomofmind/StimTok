import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '074-breathing-gradient-blob',
  title: 'Soft Breathing Gradient Blob',
  interaction: 'Move to gently pull the breathing blob · tap to pulse',
  palettes: [
    { name: 'Warm Calm', c1: '#ff9a8b', c2: '#ffd6a5', c3: '#a06a8a', bg: '#140a12' },
    { name: 'Cool Calm', c1: '#7dd3fc', c2: '#c4b5fd', c3: '#3a5a8a', bg: '#080c16' },
    { name: 'Forest Calm', c1: '#86efac', c2: '#fde68a', c3: '#2a6a5a', bg: '#06120e' },
  ],
}

// Paced for breath work: 4s in, 2s hold, 6s out, 1s rest (13s cycle).
const FRAG = `
float breathCurve(float t) {
  float c = mod(t, 13.0);
  if (c < 4.0) {
    float f = c / 4.0;
    return f * f * (3.0 - 2.0 * f);           // inhale
  } else if (c < 6.0) {
    return 1.0;                                // hold full
  } else if (c < 12.0) {
    float f = (c - 6.0) / 6.0;
    return 1.0 - f * f * (3.0 - 2.0 * f);      // exhale
  }
  return 0.0;                                  // rest
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  float breath = breathCurve(uTime);
  float radius = 0.16 + breath * 0.16;

  // Organic blob edge: radius modulated by slow angular noise.
  float a = atan(uv.y, uv.x);
  float r = length(uv);
  float wob = fbm(vec2(cos(a), sin(a)) * 2.0 + uTime * 0.12) - 0.5;
  float edge = radius + wob * 0.045 * (0.6 + breath * 0.5);

  // Very soft falloff — no hard rim anywhere.
  float blob = smoothstep(edge + 0.13, edge - 0.13, r);
  float halo = exp(-max(r - edge, 0.0) * 5.0);

  // Interior gradient that also drifts, so the blob never looks static.
  float grad = smoothstep(-edge, edge, uv.y + wob * 0.1);
  vec3 inner = mix(uC1, uC2, grad);
  inner = mix(inner, uC3, smoothstep(0.0, edge, r) * 0.45);

  vec3 col = uBg;
  col += uC3 * halo * 0.16 * (0.5 + uIntensity * 0.6);
  col = mix(col, inner, blob);

  // Gentle overall brightness swell with the breath.
  col *= 0.78 + breath * 0.22 * (0.5 + uIntensity);

  float vig = 1.0 - 0.4 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
