import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '011-venetian-blinds-light',
  title: 'Light Through Venetian Blinds',
  interaction: 'Move to bend the bands of light · press and stir',
  palettes: [
    { name: 'Golden Afternoon', c1: '#ffd9a0', c2: '#ff9d5c', c3: '#4a3828', bg: '#241a12' },
    { name: 'Blue Morning', c1: '#cfe3ff', c2: '#8db8e8', c3: '#2a3648', bg: '#141c28' },
    { name: 'Neo Noir', c1: '#ff5d8f', c2: '#7a4fd0', c3: '#241a30', bg: '#0d0812' },
  ],
}

const FRAG = `
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Sun angle drifts slowly, tilting the stripes across the wall.
  float ang = 0.35 + sin(uTime * 0.05) * 0.18;
  float band = p.y * 7.0 + p.x * ang * 4.0;

  // Slat shadow profile: soft-edged light gaps between slats.
  float f = fract(band);
  float gap = smoothstep(0.12, 0.3, f) * (1.0 - smoothstep(0.55, 0.75, f));

  // Clouds passing outside dim the whole window now and then.
  float cloud = 0.55 + 0.45 * fbm(vec2(uTime * 0.06, 3.7));
  // Leaves/branches outside break the light with soft moving blotches.
  float leaves = fbm(p * 2.2 + vec2(uTime * 0.08, sin(uTime * 0.1) * 0.3));
  float leafMask = smoothstep(0.35, 0.62, leaves);

  float light = gap * cloud * mix(0.55, 1.0, leafMask) * (0.5 + uIntensity * 0.75);

  // Wall base + warm light + soft bounce
  vec3 col = uBg;
  col += uC1 * light;
  col += uC2 * light * light * 0.6;
  col += uC3 * (1.0 - light) * 0.25;

  // Dust motes drifting through the bright bands
  vec2 dust = fract(p * 14.0 + vec2(uTime * 0.03, -uTime * 0.015));
  float mote = smoothstep(0.03, 0.0, length(dust - 0.5) - 0.004) * hash21(floor(p * 14.0 + vec2(uTime * 0.03, -uTime * 0.015)));
  col += uC1 * mote * light * 2.0;

  // Vignette
  float vig = 1.0 - 0.45 * length(uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG)
  return v.start()
}
