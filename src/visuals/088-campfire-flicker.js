import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '088-campfire-flicker',
  title: 'Campfire Flame Flicker',
  interaction: 'Move through the flame to bend it · press for a heat wave',
  palettes: [
    { name: 'Warm Campfire', c1: '#fff2b0', c2: '#ff8a2e', c3: '#8a2a10', bg: '#0a0603' },
    { name: 'Driftwood Blue', c1: '#d8f0ff', c2: '#3ca8ff', c3: '#1a3a8a', bg: '#03060c' },
    { name: 'Emerald Fire', c1: '#e8ffd8', c2: '#5fe85f', c3: '#1a6a2a', bg: '#030a04' },
  ],
}

// Rising-turbulence fire: noise advected upward, shaped by a hearth mask,
// with logs silhouetted in front and embers lifting off the top.
const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime;

  // Fire body: sample turbulence in a frame that scrolls downward, so the
  // pattern appears to rise; scale x/y differently for tall licking flames.
  vec2 fp = vec2(p.x * 3.4, p.y * 1.5 - t * 1.1);
  float turb = fbm(fp + fbm(fp * 2.1 + vec2(0.0, -t * 0.7)) * 0.8);

  // Flame envelope: widest at the base, tapering with height, with a
  // side-to-side lick driven by slow noise.
  float lick = (fbm(vec2(t * 0.55, p.y * 2.0)) - 0.5) * 0.34;
  float x = p.x - lick * smoothstep(0.05, 0.9, p.y);
  float halfWidth = 0.30 * (1.0 - smoothstep(0.02, 0.85, p.y)) + 0.02;
  float envelope = 1.0 - smoothstep(0.0, 1.0, abs(x) / halfWidth);
  envelope *= smoothstep(-0.02, 0.12, p.y) * (1.0 - smoothstep(0.55, 0.95, p.y));

  // Combine: turbulence eats into the envelope to make ragged flame tips.
  float flame = clamp(envelope * 1.5 - (1.0 - turb) * 1.1, 0.0, 1.0);
  flame = pow(flame, 0.85) * (0.6 + uIntensity * 0.6);

  // Heat ramp: dark red edges -> orange -> yellow -> white core.
  vec3 col = uBg;
  col = mix(col, uC3, smoothstep(0.02, 0.22, flame));
  col = mix(col, uC2, smoothstep(0.16, 0.48, flame));
  col = mix(col, uC1, smoothstep(0.42, 0.78, flame));
  col = mix(col, vec3(1.0), smoothstep(0.75, 0.95, flame) * 0.75);

  // Ambient glow bathing the scene, pulsing with the fire.
  float pulse = 0.85 + 0.15 * fbm(vec2(t * 1.4, 0.0));
  float glow = exp(-length(vec2(p.x * 1.2, (p.y - 0.15) * 0.9)) * 2.6) * pulse;
  col += uC2 * glow * 0.35 * (0.5 + uIntensity * 0.6);

  // Embers drifting up out of the flame.
  vec2 eg = vec2(p.x * 8.0, p.y * 3.0 - t * 0.75);
  vec2 eid = floor(eg);
  vec2 ef = fract(eg) - 0.5;
  float eseed = hash21(eid);
  if (eseed > 0.955) {
    vec2 eoff = (hash22(eid) - 0.5) * 0.6;
    eoff.x += sin(t * 2.0 + eseed * 30.0) * 0.18;
    float ed = length(ef - eoff);
    float ember = smoothstep(0.055, 0.0, ed);
    // Embers cool and fade as they rise.
    float fade = smoothstep(1.0, 0.25, p.y);
    col += mix(uC2, uC1, hash21(eid + 3.0)) * ember * fade * 1.6;
  }

  // Logs: dark silhouettes with glowing edges near the base.
  float logA = smoothstep(0.045, 0.0, abs((p.y - 0.05) + p.x * 0.16) - 0.03);
  float logB = smoothstep(0.045, 0.0, abs((p.y - 0.02) - p.x * 0.19) - 0.028);
  float logs = clamp(max(logA, logB) * step(p.y, 0.16) * step(abs(p.x), 0.42), 0.0, 1.0);
  vec3 logCol = uC3 * 0.22 + uC2 * glow * 0.5;
  col = mix(col, logCol, logs);

  float vig = 1.0 - 0.45 * length(uv - vec2(0.5, 0.35));
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
