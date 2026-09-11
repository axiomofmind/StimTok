import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '086-blackhole-accretion',
  title: 'Black-Hole Accretion Swirl',
  interaction:
    'Drag to launch an orbital particle · tap for a circular orbit · switch to View to turn the disc',
  palettes: [
    {
      name: 'Interstellar',
      c1: '#ffd9a0',
      c2: '#ff8a3c',
      c3: '#8ad0ff',
      bg: '#020208',
    },
    {
      name: 'Blue Quasar',
      c1: '#d8ecff',
      c2: '#4a9cf7',
      c3: '#c084fc',
      bg: '#010409',
    },
    {
      name: 'Crimson Maw',
      c1: '#ffd0d0',
      c2: '#e8384a',
      c3: '#ffb03c',
      bg: '#080202',
    },
  ],
}

// Differentially-rotating accretion disc with Doppler beaming, an event
// horizon shadow, and a lensed photon ring.
const FRAG = `
uniform float uInclination;
uniform float uView;
uniform vec4 uTrails[24];
uniform float uCount;
uniform vec4 uAim;
uniform float uAiming;
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  uv*=max(1.0,1.7/(uRes.x/max(uRes.y,1.0)));
  uv=rot2(uView)*uv;
  // Tilt the disc: squash vertically to give a viewing inclination.
  vec2 d = vec2(uv.x, uv.y / uInclination);
  float r = length(d);
  float a = atan(d.y, d.x);

  float horizon = 0.11;   // event horizon radius
  float rIn = 0.17;       // inner disc edge
  float rOut = 0.72;      // outer disc edge

  vec3 col = uBg;

  // --- accretion disc ---
  if (r > rIn * 0.6) {
    // Keplerian shear: inner material orbits much faster, which winds the
    // turbulence into the characteristic spiral streaks.
    float omega = 1.6 / pow(max(r, 0.05), 1.5);
    float swirl = a + uTime * omega * 0.35;

    // Turbulent gas along the sheared coordinate.
    vec2 gp = vec2(cos(swirl), sin(swirl)) * r * 3.2;
    float gas = fbm(gp * 1.8 + vec2(uTime * 0.06, 0.0));
    gas = gas * 0.65 + fbm(gp * 4.5 - uTime * 0.1) * 0.35;

    // Radial profile: bright just outside the ISCO, fading outward.
    float profile = smoothstep(rIn * 0.9, rIn * 1.25, r) * (1.0 - smoothstep(rOut * 0.55, rOut, r));
    // Temperature: hotter (whiter) closer in.
    float temp = 1.0 - smoothstep(rIn, rOut * 0.8, r);

    // Doppler beaming: the side rotating toward us is much brighter.
    float doppler = 1.0 + 0.85 * cos(a);

    float bright = profile * (0.45 + gas * 0.9) * doppler;
    vec3 discCol = mix(uC2, uC1, temp);
    discCol = mix(discCol, vec3(1.0), pow(temp, 3.0) * 0.6);
    col += discCol * bright * (0.7 + uIntensity * 0.7);

    // Thin bright inner rim
    col += uC1 * exp(-abs(r - rIn * 1.15) * 42.0) * doppler * 0.7;
  }

  // --- lensed light above and below (the "halo" arc) ---
  float lens = exp(-abs(length(uv) - horizon * 1.55) * 26.0);
  col += mix(uC1, uC3, 0.4) * lens * (0.55 + uIntensity * 0.5);

  // --- photon ring: razor-thin bright circle at ~1.5 r_s ---
  float photon = exp(-abs(length(uv) - horizon * 1.3) * 90.0);
  col += vec3(1.0) * photon * 1.1;

  // --- event horizon shadow (perfectly black, slightly soft edge) ---
  float shadow = smoothstep(horizon * 1.02, horizon * 0.96, length(uv));
  col *= 1.0 - shadow;

  // Gravitational-lensing distortion of the background starfield.
  float rr = length(uv);
  vec2 bent = uv * (1.0 + 0.045 / max(rr * rr, 0.004));
  vec2 sg = bent * 70.0;
  float sh = hash21(floor(sg));
  float star = step(0.997, sh) * (0.5 + 0.5 * sin(uTime * 1.6 + sh * 40.0));
  star*=exp(-dot(fract(sg)-.5,fract(sg)-.5)*140.0);
  col += vec3(1.0) * star * (1.0 - shadow) * 0.85;

  for(int i=0;i<24;i++){
   if(float(i)>=uCount)break;
   vec4 trail=uTrails[i];
   vec2 a=vec2(trail.x,trail.y*uInclination),b=vec2(trail.z,trail.w*uInclination),ab=b-a;
   float h=clamp(dot(uv-a,ab)/max(dot(ab,ab),.00001),0.0,1.0);
   float dist=length(uv-a-ab*h);
   col+=uC3*exp(-dist*140.0)*.5+vec3(1.0)*exp(-length(uv-b)*220.0);
  }
  if(uAiming>.5){
    vec2 start=vec2(uAim.x,uAim.y*uInclination),end=vec2(uAim.z,uAim.w*uInclination),ab=end-start;
    float h=clamp(dot(uv-start,ab)/max(dot(ab,ab),.00001),0.0,1.0);
    float guide=exp(-length(uv-start-ab*h)*500.0);
    col+=uC3*guide*.65;
    col+=uC3*exp(-abs(length(uv-start)-.015)*400.0)*.6;
  }
  float vig = 1.0 - 0.3 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const data = new Float32Array(24 * 4),
    particles = []
  let mode = 'launch',
    grip = null,
    view = 0
  const aim = new Float32Array(4)
  const v = shaderVisual(container, opts, meta, FRAG, {
    uTrails: { value: data },
    uCount: { value: 0 },
    uInclination: { value: 0.45 },
    uView: { value: 0 },
    uAim: { value: aim },
    uAiming: { value: 0 },
  })
  v.addSlider('Gravity', 'gravity', 0.03, 0.25, 0.01, 0.09)
  v.addSlider('Viewing angle', 'inclination', 0.25, 0.9, 0.01, 0.45)
  v.addAction('Launch mode', () => (mode = 'launch'))
  v.addAction('View mode', () => (mode = 'view'))
  const clear = v.addAction('Clear orbits', () => (particles.length = 0))
  function point(e) {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight),
      scale = Math.max(1, 1.7 / aspect),
      x = (e.u - 0.5) * aspect * scale,
      y = (e.v - 0.5) * scale
    return {
      x: x * Math.cos(view) + y * Math.sin(view),
      y: (-x * Math.sin(view) + y * Math.cos(view)) / v.state.inclination,
    }
  }
  function launch(p, vx, vy) {
    if (Math.hypot(p.x, p.y) < 0.13) return
    if (particles.length >= 24) particles.shift()
    particles.push({ ...p, vx, vy, px: p.x, py: p.y, age: 0 })
  }
  v.addAction('Seed orbits', () => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        r = 0.28 + i * 0.045,
        speed = Math.sqrt(v.state.gravity / r)
      launch(
        { x: Math.cos(a) * r, y: Math.sin(a) * r },
        -Math.sin(a) * speed,
        Math.cos(a) * speed,
      )
    }
  })
  v.onPointer((e) => {
    if (e.type === 'down') grip = { ...point(e), screenX: e.x, view }
    if (e.type === 'drag' && grip && mode === 'view')
      view = grip.view + ((e.x - grip.screenX) / container.clientWidth) * 3
    if (e.type === 'up' && grip) {
      if (mode === 'launch' && !e.cancelled) {
        const p = point(e),
          dx = p.x - grip.x,
          dy = p.y - grip.y,
          r = Math.hypot(grip.x, grip.y)
        if (Math.hypot(dx, dy) < 0.035) {
          const speed = Math.sqrt(v.state.gravity / Math.max(0.13, r))
          launch(grip, (-grip.y / r) * speed, (grip.x / r) * speed)
        } else
          launch(
            grip,
            Math.max(-1.5, Math.min(1.5, dx * 2)),
            Math.max(-1.5, Math.min(1.5, dy * 2)),
          )
      }
      grip = null
    }
  })
  v.onFrame((dt, t, state) => {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))),
      step = dt / steps
    for (const p of particles) {
      p.px = p.x
      p.py = p.y
      for (let i = 0; i < steps; i++) {
        const r = Math.hypot(p.x, p.y)
        if (r < 0.11) {
          p.age = 100
          break
        }
        const force = state.gravity / Math.max(0.001, r * r * r)
        p.vx -= p.x * force * step
        p.vy -= p.y * force * step
        p.x += p.vx * step
        p.y += p.vy * step
      }
      p.age += dt
    }
    for (let i = particles.length - 1; i >= 0; i--)
      if (
        particles[i].age > 60 ||
        Math.hypot(particles[i].x, particles[i].y) > 3
      )
        particles.splice(i, 1)
    particles.forEach((p, i) =>
      data.set([p.px - p.vx * 0.07, p.py - p.vy * 0.07, p.x, p.y], i * 4),
    )
    v.uniforms.uCount.value = particles.length
    v.uniforms.uView.value = view
    v.uniforms.uInclination.value = state.inclination
    clear.textContent = 'Clear orbits · ' + particles.length
    v.uniforms.uAiming.value = grip && mode === 'launch' ? 1 : 0
    if (grip) {
      const p = point(v.pointer)
      aim.set([grip.x, grip.y, p.x, p.y])
    }
  })
  return v.start()
}
