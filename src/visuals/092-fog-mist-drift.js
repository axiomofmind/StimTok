import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '092-fog-mist-drift',
  title: 'Color-Shifting Fog/Mist Drift',
  interaction: 'Move through the fog to part it · press and swirl the mist',
  palettes: [
    { name: 'Club Haze', c1: '#ff2975', c2: '#00d9ff', c3: '#a855f7', bg: '#050308' },
    { name: 'Dawn Mist', c1: '#ffd8b0', c2: '#a8c8e8', c3: '#e8b8d0', bg: '#0e0c10' },
    { name: 'Forest Fog', c1: '#a0e8c0', c2: '#7da8c8', c3: '#d8f0e0', bg: '#060c0a' },
  ],
}

// Layered fog banks drifting at different speeds, lit by slow-moving
// colored beams — the theatrical haze look.
const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.055;

  // Three fog layers with different scales/speeds for parallax depth.
  float f1 = fbm(vec2(p.x * 1.1 - t * 1.4, p.y * 2.0 + t * 0.25));
  float f2 = fbm(vec2(p.x * 1.9 + t * 0.9, p.y * 3.0 - t * 0.18) + 20.0);
  float f3 = fbm(vec2(p.x * 3.2 - t * 0.5, p.y * 4.4 + t * 0.12) + 50.0);

  float fog = f1 * 0.5 + f2 * 0.32 + f3 * 0.18;
  // Fog pools lower in the frame, thinning toward the top.
  fog *= mix(1.25, 0.35, smoothstep(0.0, 0.95, uv.y));

  // Three colored beams sweeping through the haze at different rates.
  float beamA = exp(-pow((p.x - (0.5 * aspect + sin(uTime * 0.13) * 0.9)) * 2.2, 2.0));
  float beamB = exp(-pow((p.x - (0.5 * aspect + sin(uTime * 0.09 + 2.2) * 1.1)) * 1.7, 2.0));
  float beamC = exp(-pow((p.x - (0.5 * aspect + sin(uTime * 0.17 + 4.4) * 0.7)) * 2.8, 2.0));

  // Beams only become visible where there's fog to scatter in.
  float scatter = smoothstep(0.18, 0.75, fog);

  vec3 col = uBg;
  col += uC1 * beamA * scatter * 0.85;
  col += uC2 * beamB * scatter * 0.75;
  col += uC3 * beamC * scatter * 0.6;

  // Base fog luminance, tinted by whichever beam dominates.
  vec3 fogTint = normalize(uC1 * beamA + uC2 * beamB + uC3 * beamC + vec3(0.05));
  col += fogTint * fog * 0.22;

  // Slow overall color breathing.
  col *= 0.85 + 0.15 * sin(uTime * 0.2);
  col *= 0.55 + uIntensity * 0.75;

  // Soft floor bounce
  col += fogTint * smoothstep(0.35, 0.0, uv.y) * 0.1;

  float vig = 1.0 - 0.4 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
