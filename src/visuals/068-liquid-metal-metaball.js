import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '068-liquid-metal-metaball',
  title: 'Liquid-Metal Metaball Morph',
  interaction:
    'Click to collapse the metal into a splash · drag to pull and stretch it',
  palettes: [
    {
      name: 'Chrome',
      c1: '#e8ecf2',
      c2: '#5a6a7a',
      c3: '#a8c8e8',
      bg: '#080a0e',
    },
    {
      name: 'Molten Gold',
      c1: '#ffe8a0',
      c2: '#8a6a1a',
      c3: '#ffb03c',
      bg: '#0e0a04',
    },
    {
      name: 'Mercury Rose',
      c1: '#ffd8e8',
      c2: '#7a5a6a',
      c3: '#e8a0c8',
      bg: '#0c060a',
    },
  ],
}

const N = 8

// Raymarched metaballs with an environment-mapped chrome shading model.
const FRAG = `
uniform vec4 uBalls[${N}]; // xyz center, w radius

float map(vec3 p) {
  // Smooth-min accumulation via exponential blending.
  float sum = 0.0;
  for (int i = 0; i < ${N}; i++) {
    vec4 b = uBalls[i];
    float d = length(p - b.xyz) - b.w;
    sum += exp(-6.0 * d);
  }
  return -log(max(sum, 0.0001)) / 6.0;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Cheap studio environment: gradient sky, bright overhead strip, warm floor.
vec3 envColor(vec3 rd) {
  float up = rd.y * 0.5 + 0.5;
  vec3 sky = mix(uC2 * 0.35, uC3, smoothstep(0.35, 1.0, up));
  // Overhead softbox
  float box = smoothstep(0.86, 0.995, rd.y) * 1.6;
  sky += uC1 * box;
  // Horizon band
  sky += uC1 * 0.25 * exp(-abs(rd.y) * 14.0);
  // Floor bounce
  sky = mix(sky, uC2 * 0.5, smoothstep(0.1, -0.6, rd.y));
  return sky;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  vec3 ro = vec3(0.0, 0.0, 3.6);
  vec3 rd = normalize(vec3(uv * 1.25, -1.6));

  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 70; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.002) { hit = 1.0; break; }
    if (t > 8.0) break;
    t += d * 0.85;
  }

  vec3 col = mix(uBg, envColor(rd) * 0.25, 0.6);

  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 refl = reflect(rd, n);

    // Chrome: almost pure reflection with a fresnel-boosted rim.
    float fres = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
    vec3 env = envColor(refl);
    col = env * (0.55 + uIntensity * 0.5);
    col += uC1 * fres * 0.8;

    // Sharp specular from the key light
    vec3 L = normalize(vec3(-0.4, 0.9, 0.5));
    float spec = pow(max(dot(refl, L), 0.0), 90.0);
    col += vec3(1.0) * spec * 1.6;

    // Subtle iridescent tint that shifts with the normal
    col += uC3 * 0.12 * (0.5 + 0.5 * sin(n.x * 4.0 + n.y * 3.0 + uTime * 0.4));

    // Contact darkening where surfaces fold into each other
    col *= 0.75 + 0.25 * smoothstep(0.0, 0.4, map(p + n * 0.12));
  }

  float vig = 1.0 - 0.35 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const data = new Float32Array(N * 4)
  const balls = []
  for (let i = 0; i < N; i++) {
    balls.push({
      // Each ball rides its own slow lissajous orbit so they endlessly
      // merge and separate without ever repeating exactly.
      ax: 0.5 + Math.random() * 0.7,
      ay: 0.4 + Math.random() * 0.6,
      az: 0.3 + Math.random() * 0.5,
      fx: 0.11 + Math.random() * 0.13,
      fy: 0.13 + Math.random() * 0.15,
      fz: 0.09 + Math.random() * 0.11,
      px: Math.random() * 6.28,
      py: Math.random() * 6.28,
      pz: Math.random() * 6.28,
      r: 0.3 + Math.random() * 0.18,
      x: 0,
      y: 0,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      pulse: 0,
    })
  }

  const v = shaderVisual(container, opts, meta, FRAG, {
    uBalls: { value: data },
  })

  let selected = -1
  v.addSlider('Cohesion', 'cohesion', 0.1, 2, 0.1, 0.6)
  v.addSlider('Viscosity', 'viscosity', 0.5, 4, 0.05, 2.25)
  v.addAction('Gather drops', () => {
    balls.forEach((b) => {
      b.vx -= b.x * 1.5
      b.vy -= b.y * 1.5
    })
  })
  function pointerPosition(event) {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight)
    return {
      x: (event.u - 0.5) * aspect * 2.8125,
      y: (event.v - 0.5) * 2.8125,
    }
  }

  function strike(event, scatter = false) {
    const pointer = pointerPosition(event)
    for (let i = 0; i < N; i++) {
      if (i !== selected) continue
      const b = balls[i]
      const dx = pointer.x - b.x
      const dy = pointer.y - b.y
      if (scatter) {
        const distance = Math.max(0.12, Math.hypot(dx, dy))
        b.vx -= (dx / distance) * (1.6 + event.speed / 950)
        b.vy -= (dy / distance) * (1.6 + event.speed / 950)
      } else {
        // A click visibly implodes every lobe toward the impact before the
        // spring model throws it back into a liquid-metal splash.
        b.ox += dx * (0.48 + (i % 3) * 0.07)
        b.oy += dy * (0.48 + (i % 3) * 0.07)
        b.vx += dx * 1.9
        b.vy += dy * 1.9
      }
      b.pulse = 1
    }
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      const p = pointerPosition(event)
      let distance = Infinity
      selected = -1
      balls.forEach((b, i) => {
        const d = Math.hypot(b.x - p.x, b.y - p.y)
        if (d < distance && d < b.r * 1.8) {
          distance = d
          selected = i
        }
      })
    }
    if (event.type === 'tap') strike(event)
    if (event.type === 'fling') strike(event, true)
    if (event.type === 'up') selected = -1
  })

  v.onReset(() => {
    for (const b of balls) {
      b.ox = b.oy = b.vx = b.vy = b.pulse = 0
    }
  })

  v.onFrame((dt, t, state) => {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight)
    const pointerX = (v.pointer.u - 0.5) * aspect * 2.8125
    const pointerY = (v.pointer.v - 0.5) * 2.8125
    for (let i = 0; i < N; i++) {
      const b = balls[i]
      const orbitX = Math.sin((state.demo ? t : 0) * b.fx * 6.28 + b.px) * b.ax
      const orbitY = Math.sin((state.demo ? t : 0) * b.fy * 6.28 + b.py) * b.ay
      if (state.demo) {
        b.vx += -b.ox * 2 * dt
        b.vy += -b.oy * 2 * dt
      }
      for (const other of balls) {
        if (other === b) continue
        const dx = other.x - b.x,
          dy = other.y - b.y,
          d = Math.hypot(dx, dy)
        if (d > 0.2 && d < 1) {
          b.vx += dx * state.cohesion * dt * 0.25
          b.vy += dy * state.cohesion * dt * 0.25
        }
      }
      b.vx *= Math.exp(-dt * state.viscosity)
      b.vy *= Math.exp(-dt * state.viscosity)
      b.ox = Math.max(-2, Math.min(2, b.ox + b.vx * dt))
      b.oy = Math.max(-1.4, Math.min(1.4, b.oy + b.vy * dt))
      b.pulse *= Math.exp(-dt * 3.2)
      let x = orbitX + b.ox
      let y = orbitY + b.oy
      if (v.pointer.down && i === selected) {
        const influence = Math.exp(
          -Math.hypot(x - pointerX, y - pointerY) * 0.7,
        )
        b.vx += (pointerX - x) * influence * 11 * dt
        b.vy += (pointerY - y) * influence * 11 * dt
        x += (pointerX - x) * influence * 0.32
        y += (pointerY - y) * influence * 0.32
      }
      b.x = x
      b.y = y
      data[i * 4] = x
      data[i * 4 + 1] = y
      data[i * 4 + 2] = Math.sin(t * b.fz * 6.28 + b.pz) * b.az
      data[i * 4 + 3] =
        b.r * (0.9 + 0.1 * Math.sin(t * 0.7 + i) + b.pulse * 0.22)
    }
  })

  return v.start()
}
