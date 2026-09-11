import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '013-candle-flame',
  title: 'Flickering Candle Flame',
  interaction: 'Move near the flame to bend it · press for a heat ripple',
  palettes: [
    { name: 'Warm Wax', c1: '#fff4c8', c2: '#ff9d3c', c3: '#e8d5b0', bg: '#0d0805' },
    { name: 'Blue Wick', c1: '#d8ecff', c2: '#5c9dff', c3: '#c8d8e8', bg: '#04060d' },
    { name: 'Rose Candle', c1: '#ffe0ec', c2: '#ff5d8f', c3: '#e8b4c8', bg: '#0d0508' },
  ],
}

const FRAG = `
// Teardrop flame SDF, distorted by rising noise for the flicker.
float flame(vec2 p, float t) {
  // Rising turbulence bends the flame tip
  float wob = (fbm(vec2(p.y * 2.0 - t * 2.4, t * 0.8)) - 0.5) * (0.14 + 0.1 * uIntensity);
  p.x += wob * smoothstep(0.0, 1.0, p.y);
  // Teardrop: wide at base, tapering to the tip
  float width = 0.16 * (1.0 - smoothstep(-0.1, 1.0, p.y)) + 0.015;
  float d = abs(p.x) / width;
  float body = 1.0 - smoothstep(0.0, 1.0, d);
  body *= smoothstep(-0.12, 0.05, p.y) * (1.0 - smoothstep(0.75, 1.05, p.y));
  return clamp(body, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.35);

  float t = uTime;
  // Slow breathing of overall flame height
  float breathe = 0.9 + 0.1 * sin(t * 1.1) + 0.05 * sin(t * 3.7);
  vec2 fp = vec2(p.x, p.y / breathe) * 1.6;

  float outer = flame(fp, t);
  float inner = flame(fp * vec2(1.9, 1.25) + vec2(0.0, -0.02), t);
  float core  = flame(fp * vec2(3.2, 1.6) + vec2(0.0, -0.06), t);

  // Halo glow around the flame
  float halo = exp(-length(p * vec2(1.4, 1.0) - vec2(0.0, 0.18)) * 4.5) * (0.4 + uIntensity * 0.5);
  halo *= 0.85 + 0.15 * sin(t * 6.3) * sin(t * 2.9);

  vec3 col = uBg;
  col += uC2 * halo * 0.9;
  col = mix(col, uC2, outer * 0.85);
  col = mix(col, uC1, inner);
  col = mix(col, vec3(1.0), core * 0.9);
  // Blue base of the flame
  col = mix(col, vec3(0.35, 0.5, 1.0) * 0.8, smoothstep(0.04, 0.0, fp.y) * outer * 0.7);

  // Candle body + wick
  float candle = smoothstep(0.245, 0.235, abs(p.x)) * smoothstep(-0.32, -0.34, p.y) * step(p.y, -0.32);
  candle = clamp(smoothstep(0.25, 0.24, abs(p.x)) * (1.0 - smoothstep(-0.34, -0.32, p.y)), 0.0, 1.0);
  vec3 waxLit = uC3 * (0.35 + halo * 2.2);
  col = mix(col, waxLit, candle);
  float wick = smoothstep(0.014, 0.008, abs(p.x)) * (1.0 - smoothstep(-0.32, -0.18, p.y) ) * step(-0.34, p.y);
  wick *= step(p.y, -0.16);
  col = mix(col, vec3(0.05), clamp(wick, 0.0, 1.0));

  float vig = 1.0 - 0.5 * length(uv - vec2(0.5, 0.45));
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
