import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '027-rain-window',
  title: 'Rain on Window',
  interaction: 'Drag over the glass to bend the rain · tap for a ripple',
  palettes: [
    { name: 'City Night', c1: '#ffd88a', c2: '#7db8f0', c3: '#f472b6', bg: '#0a0e18' },
    { name: 'Grey Afternoon', c1: '#e8e8e8', c2: '#9aa8b8', c3: '#c8d0d8', bg: '#242a32' },
    { name: 'Neon Rain', c1: '#ff2975', c2: '#00f0ff', c3: '#8a2be2', bg: '#08040f' },
  ],
}

// Classic droplet-grid technique: cells with wobbling drops + drip trails,
// refracting a procedural bokeh background.
const FRAG = `
// Procedural blurred city-light background
vec3 bgLights(vec2 uv, float blur) {
  vec3 col = uBg;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 lp = hash22(vec2(fi * 3.7, fi * 9.1));
    lp.y = lp.y * 0.7 + 0.05;
    float size = 0.03 + hash21(vec2(fi, 2.0)) * 0.10;
    float d = length((uv - lp) * vec2(1.0, 1.4));
    float glow = smoothstep(size + blur, size * 0.3, d);
    vec3 lc = mix(uC1, uC2, hash21(vec2(fi, 5.0)));
    lc = mix(lc, uC3, step(0.75, hash21(vec2(fi, 8.0))));
    col += lc * glow * 0.55;
  }
  // gradient sky/street
  col += uC2 * 0.08 * (1.0 - uv.y);
  return col;
}

// One layer of drops; returns 2D refraction offset.
vec2 dropLayer(vec2 uv, float t, float zoom) {
  vec2 asp = vec2(3.0, 1.0);
  vec2 st = uv * zoom * asp;
  vec2 id = floor(st);
  st = fract(st) - 0.5;

  float n = hash21(id);
  t += n * 6.2831;

  // Drop slides down over the cell with a wiggle
  float w = uv.y * 8.0;
  float x = (n - 0.5) * 0.7;
  x += (0.4 - abs(x)) * sin(3.0 * w) * pow(sin(w), 6.0) * 0.44;
  float y = -sin(t + sin(t + sin(t) * 0.5)) * 0.44;
  y -= (st.x - x) * (st.x - x);

  vec2 dropPos = (st - vec2(x, y)) / asp;
  float drop = smoothstep(0.05, 0.02, length(dropPos));

  // Trail droplets above the drop
  vec2 trailPos = (st - vec2(x, t * 0.22)) / asp;
  trailPos.y = (fract(trailPos.y * 8.0) - 0.5) / 8.0;
  float trail = smoothstep(0.028, 0.014, length(trailPos));
  float fogTrail = smoothstep(-0.05, 0.05, dropPos.y);
  fogTrail *= smoothstep(0.5, y, st.y);
  trail *= fogTrail;

  return vec2(drop) * dropPos * 30.0 + vec2(trail) * trailPos * 12.0;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.4;

  vec2 offs = dropLayer(uv, t, 3.0) + dropLayer(uv * 1.23 + 7.54, t * 1.15, 5.0) * 0.7;
  float wet = length(offs);

  // Sharp where drops refract, blurry glass elsewhere
  float blur = mix(0.12, 0.0, smoothstep(0.0, 0.4, wet)) * (1.2 - uIntensity * 0.4);
  vec3 col = bgLights(uv + offs * 0.08, blur + 0.02);

  // Condensation haze that the drops clear away
  float haze = (0.14 - smoothstep(0.0, 0.5, wet) * 0.14) * (1.3 - uIntensity * 0.5);
  col = mix(col, uBg + vec3(0.10), clamp(haze, 0.0, 1.0));

  // Glass edge vignette
  float vig = 1.0 - 0.4 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
