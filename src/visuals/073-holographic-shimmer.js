import { THREE, shaderVisual } from '../lib/visual-kit.js'
import { ORGANIC_NOISE } from '../lib/organic-noise.js'

export const meta = {
  id: '073-holographic-shimmer',
  title: 'Holographic Iridescent Shimmer',
  interaction:
    'Drag to tilt the rainbow foil · tap to ripple its surface · Tune adjusts the crinkles',
  palettes: [
    {
      name: 'Full Spectrum',
      c1: '#ff2975',
      c2: '#00f0ff',
      c3: '#a8ff5f',
      bg: '#0a0a12',
    },
    {
      name: 'Pearl',
      c1: '#ffd8e8',
      c2: '#d8f0ff',
      c3: '#fff8d8',
      bg: '#12101a',
    },
    {
      name: 'Oil Slick',
      c1: '#8a2be2',
      c2: '#00d9c0',
      c3: '#ff8a2e',
      bg: '#06060a',
    },
  ],
}

// Thin-film interference: the "hue" of each point depends on the effective
// film thickness seen at that viewing angle, which is what makes holo foil
// shift colors as it tilts.
const FRAG = `
${ORGANIC_NOISE}
uniform vec2 uTilt;
uniform float uCrinkle;
uniform float uFilm;
uniform vec4 uRipples[6];
float foil(vec2 p, float t) {
  float h = organicFbm(p * 1.6 + vec2(t * 0.025, 0.0)) * 0.7
          + organicFbm(p * 3.4 - vec2(0.0, t * 0.02) + 20.0) * 0.3;
  for (int i = 0; i < 6; i++) {
    vec4 r = uRipples[i];
    float d = length(p - r.xy), age = uTime - r.z;
    h += sin(d * 14.0 - age * 6.0) * exp(-d * 1.8 - age * 1.7) * r.w * 0.16;
  }
  return h;
}
vec3 spectrum(float x) {
  x = fract(x);
  return clamp(vec3(
    abs(x * 6.0 - 3.0) - 1.0,
    2.0 - abs(x * 6.0 - 2.0),
    2.0 - abs(x * 6.0 - 4.0)
  ), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  float t = uTime;

  // Crinkled foil surface: layered noise gives a normal we can "tilt".
  vec2 p = uv * 2.4;
  float height = foil(p, t);

  // Surface normal from the height field.
  // Central differences over a visible footprint suppress tiny noisy normals.
  vec2 e = vec2(max(0.012, 2.4 / max(uRes.y, 1.0)), 0.0);
  float dx = foil(p + e.xy, t) - foil(p - e.xy, t);
  float dy = foil(p + e.yx, t) - foil(p - e.yx, t);
  vec3 n = normalize(vec3(vec2(dx, dy) / (2.0 * e.x) * uCrinkle, 4.0));

  // Simulated viewing/tilt direction that sweeps slowly, so the whole
  // sheet rolls through the spectrum like real holographic film.
  vec3 viewDir = normalize(vec3(uTilt + vec2(sin(t * 0.12) * 0.18, cos(t * 0.09) * 0.14), 1.0));
  float cosTheta = max(dot(n, viewDir), 0.0);

  // Interference order: thickness modulated by the crinkles.
  float thickness = uFilm + height * 6.0;
  float interference = thickness * cosTheta;

  vec3 iri = spectrum(interference * 0.55 + t * 0.03);
  // Tint the pure spectrum toward the palette.
  vec3 tinted = iri.r * uC1 + iri.g * uC2 + iri.b * uC3;
  tinted = mix(iri * 0.5, tinted, 0.85);

  // Diffraction grating streaks (the fine rainbow lines in real holo foil).
  float grating = 0.5 + 0.5 * sin((uv.x * 55.0 + uv.y * 22.0) + interference * 2.0);
  tinted += spectrum(grating + t * 0.1) * 0.12 * uC2;

  // Specular sheen sweeping across the sheet.
  vec3 L = normalize(vec3(sin(t * 0.25), 0.6, 0.9));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);

  vec3 col = mix(uBg, tinted, 0.85) * (0.55 + uIntensity * 0.6);
  col += vec3(1.0) * spec * (0.5 + uIntensity * 0.6);
  // Deepen the creases
  col *= 0.75 + 0.35 * smoothstep(0.2, 0.8, height);

  float vig = 1.0 - 0.3 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const ripples = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0))
  const tilt = new THREE.Vector2()
  let next = 0
  const v = shaderVisual(container, opts, meta, FRAG, {
    uTilt: { value: tilt },
    uCrinkle: { value: 1 },
    uFilm: { value: 3.5 },
    uRipples: { value: ripples },
  })
  v.addSlider('Foil crinkles', 'crinkle', 0.2, 2, 0.05, 1)
  v.addSlider('Film thickness', 'film', 1, 7, 0.1, 3.5)
  v.addAction('Level foil', () => tilt.set(0, 0))
  v.addAction('Smooth ripples', () => ripples.forEach((r) => (r.w = 0)))
  v.onPointer((e) => {
    if (e.type === 'down') {
      const aspect = container.clientWidth / Math.max(1, container.clientHeight)
      ripples[next++ % ripples.length].set(
        (e.u - 0.5) * aspect * 2.4,
        (e.v - 0.5) * 2.4,
        v.state.t,
        1,
      )
    }
    if (e.type === 'drag') {
      tilt.x = THREE.MathUtils.clamp(
        tilt.x + (e.dx / container.clientWidth) * 3,
        -1.5,
        1.5,
      )
      tilt.y = THREE.MathUtils.clamp(
        tilt.y - (e.dy / container.clientHeight) * 3,
        -1.5,
        1.5,
      )
    }
  })
  v.onFrame(() => {
    v.uniforms.uCrinkle.value = v.state.crinkle
    v.uniforms.uFilm.value = v.state.film
  })
  return v.start()
}
