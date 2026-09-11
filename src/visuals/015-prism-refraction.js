import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '015-prism-refraction',
  title: 'Prism Rainbow Refraction Sweep',
  interaction:
    'Drag to aim the beam and widen the spectrum · tap for a light burst',
  palettes: [
    {
      name: 'Pure Spectrum',
      c1: '#ffffff',
      c2: '#8899aa',
      c3: '#334455',
      bg: '#04040a',
    },
    {
      name: 'Warm Studio',
      c1: '#fff0d8',
      c2: '#aa9988',
      c3: '#554433',
      bg: '#0a0705',
    },
    {
      name: 'Cold Lab',
      c1: '#e0f0ff',
      c2: '#7788bb',
      c3: '#223355',
      bg: '#03060d',
    },
  ],
}

const FRAG = `
uniform float uAim;
uniform float uRotation;
uniform float uSpread;
uniform float uBurst;
uniform float uSweep;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}

float beam(vec2 p, vec2 a, vec2 b, float width) {
  float d = segDist(p, a, b);
  return exp(-d * d / max(width * width, 0.00001));
}

vec3 spectrum(float x) {
  // Smooth spectral approximation with a little violet energy restored.
  vec3 color = clamp(vec3(
    1.25 - abs(x - 0.12) * 3.2,
    1.18 - abs(x - 0.50) * 3.0,
    1.28 - abs(x - 0.87) * 3.15
  ), 0.0, 1.0);
  color += vec3(0.24, 0.0, 0.34) * smoothstep(0.72, 1.0, x);
  return color;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float designScale = min(1.0, aspect / 1.35);
  p /= designScale;
  p = rot2(uRotation) * p;

  vec2 center = vec2(-0.08, -0.025);
  float size = 0.245;
  vec2 A = center + vec2(0.0, size);
  vec2 B = center + vec2(-size * 0.866, -size * 0.5);
  vec2 C = center + vec2(size * 0.866, -size * 0.5);

  float edge = min(min(segDist(p, A, B), segDist(p, B, C)), segDist(p, C, A));
  float outline = exp(-edge * edge / 0.000018);
  vec3 e1 = vec3(B - A, 0.0), v1 = vec3(p - A, 0.0);
  vec3 e2 = vec3(C - B, 0.0), v2 = vec3(p - B, 0.0);
  vec3 e3 = vec3(A - C, 0.0), v3 = vec3(p - C, 0.0);
  float inside = (cross(e1, v1).z > 0.0 && cross(e2, v2).z > 0.0 && cross(e3, v3).z > 0.0) ? 1.0 : 0.0;

  // The light source rides vertically along the left edge as the user aims it.
  vec2 hit = mix(A, B, 0.5 + uAim * 0.15);
  vec2 source = vec2(-max(aspect,1.35) * 0.62, uAim * 0.34);
  vec2 incomingDirection = normalize(hit - source);
  float incomingAngle = atan(incomingDirection.y, incomingDirection.x);
  float incoming = beam(p, source, hit, 0.009 + uIntensity * 0.0045);
  float incomingGlow = beam(p, source, hit, 0.035 + uIntensity * 0.007);

  vec3 col = uBg;
  col += uC1 * incoming * (1.15 + uIntensity * 0.55 + uBurst * 0.7);
  col += uC1 * incomingGlow * 0.12;

  vec2 insideDirection = refract(vec3(incomingDirection,0.0),vec3(-0.866,0.5,0.0),1.0/1.45).xy;
  vec2 face = C - A;
  vec2 delta = A - hit;
  float denominator = insideDirection.x*face.y-insideDirection.y*face.x;
  float distanceToExit = (delta.x*face.y-delta.y*face.x)/denominator;
  vec2 exitPoint = hit+insideDirection*distanceToExit;
  float spread = 0.13 + uSpread * 0.28;
  float baseAngle = incomingAngle - 0.13 + sin(uSweep) * 0.018;
  float fanMask = 0.0;
  for (int i = 0; i < 11; i++) {
    float wavelength = float(i) / 10.0;
    vec2 transmitted = refract(vec3(insideDirection,0.0),vec3(-0.866,-0.5,0.0),1.35+wavelength*spread*.22).xy;
    float refractedAngle = atan(transmitted.y,transmitted.x);
    vec2 direction = vec2(cos(refractedAngle), sin(refractedAngle));
    vec2 endPoint = exitPoint + direction * (2.3 + wavelength * 0.18);
    float core = beam(p, exitPoint, endPoint, 0.0065 + uIntensity * 0.0025);
    float glow = beam(p, exitPoint, endPoint, 0.024 + uIntensity * 0.004);
    float distanceFade = exp(-length(p - exitPoint) * 0.7);
    vec3 spectralColor = spectrum(wavelength);
    col += spectralColor * (core * 0.82 + glow * 0.07) * distanceFade * (0.9 + uIntensity * 0.45 + uBurst * 0.5);
    fanMask += glow;
  }

  // Layered glass: tinted volume, moving internal caustic, and bright bevels.
  float internal = beam(p, hit, exitPoint, 0.011 + uBurst * 0.004) * inside;
  float caustic = sin((p.x + p.y) * 38.0 + uSweep * 2.0) * 0.5 + 0.5;
  col += uC2 * inside * (0.075 + caustic * 0.035);
  col += uC3 * inside * smoothstep(0.22, 0.0, edge) * 0.08;
  col += uC1 * outline * (0.42 + uBurst * 0.34);
  col += uC1 * internal * 0.62;

  // A tap launches a short luminous wave from the exit face through the fan.
  float waveRadius = uPointerAge * 0.68;
  float wave = exp(-abs(length(p - exitPoint) - waveRadius) * 75.0) * exp(-uPointerAge * 1.8);
  col += spectrum(0.5 + 0.45 * sin(atan(p.y - exitPoint.y, p.x - exitPoint.x) * 2.0)) * wave * fanMask * 0.55;

  float dust = hash21(floor(p * 180.0) + floor(uTime * 3.0));
  col += uC1 * step(0.9965, dust) * (incomingGlow + fanMask * 0.22) * (0.35 + uBurst);

  float vignette = 1.0 - 0.34 * length(uv - 0.5);
  gl_FragColor = vec4(col * vignette, 1.0);
}
`

export function mount(container, opts = {}) {
  let aim = 0
  let targetAim = 0
  let spread = 0.62
  let targetSpread = 0.62
  let burst = 0
  let sweep = 0

  const v = shaderVisual(container, opts, meta, FRAG, {
    uAim: { value: 0 },
    uRotation: { value: 0 },
    uSpread: { value: spread },
    uBurst: { value: 0 },
    uSweep: { value: 0 },
  })

  v.addSlider('Prism angle', 'prismAngle', -0.3, 0.3, 0.01, 0)
  const dispersion = v.addSlider(
    'Dispersion',
    'dispersion',
    0.1,
    1.2,
    0.01,
    0.62,
  )
  function setSpread(value) {
    dispersion.value = Math.max(0.1, Math.min(1.2, value)).toFixed(2)
    dispersion.dispatchEvent(new Event('input'))
  }
  v.onPointer((event) => {
    if (event.type === 'down' || event.type === 'drag') {
      targetAim = event.ny
      setSpread(0.12 + event.u * 1.05)
      if (event.type === 'drag')
        sweep += (event.dx / Math.max(1, container.clientWidth)) * 0.9
    } else if (event.type === 'tap') {
      burst = 1
      setSpread(v.state.dispersion + 0.18)
    } else if (event.type === 'fling') {
      burst = Math.min(1.35, burst + event.speed / 900)
      sweep += (event.vx / Math.max(1, container.clientWidth)) * 0.35
    } else if (event.type === 'doubletap') {
      targetAim = 0
      targetSpread = 0.62
      burst = 0
    }
  })

  v.onReset(() => {
    targetAim = 0
    targetSpread = 0.62
    burst = 0
  })

  v.onFrame((dt) => {
    targetSpread = v.state.dispersion
    aim += (targetAim - aim) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 7))
    spread += (targetSpread - spread) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 6))
    burst *= Math.exp(-dt * 2.2)
    sweep += dt * (0.22 + burst * 1.3)
    v.uniforms.uRotation.value = v.state.prismAngle
    v.uniforms.uAim.value = aim
    v.uniforms.uSpread.value = spread
    v.uniforms.uBurst.value = burst
    v.uniforms.uSweep.value = sweep
  })

  return v.start()
}
