import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '059-oil-water-separation',
  title: 'Oil-and-Water Separation Drift',
  interaction:
    'Drag sideways to tilt the layers · tap to add a droplet · Shake emulsifies, then the layers separate',
  palettes: [
    {
      name: 'Golden Oil',
      c1: '#f2c230',
      c2: '#2a6a9a',
      c3: '#ffe8a0',
      bg: '#0c1018',
    },
    {
      name: 'Rose Oil',
      c1: '#f272a0',
      c2: '#3a4a8a',
      c3: '#ffd0e0',
      bg: '#0c0a16',
    },
    {
      name: 'Emerald Oil',
      c1: '#3fd88a',
      c2: '#2a3a7a',
      c3: '#c0ffdc',
      bg: '#060e12',
    },
  ],
}

// Smooth-min of a wavy interface plane with rising/falling droplets:
// droplets genuinely merge into the interface as they arrive.
const FRAG = `
uniform vec4 uDrops[24];
uniform float uTilt;
uniform float uSlosh;
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Signed distance to the oil region (negative inside oil/top).
float oilField(vec2 p, float t) {
  // Interface line with slow waves
  float iface = uSlosh * (sin(p.x * 5.0 + t * 2.0)*.7 + sin(p.x * 9.0-t*1.3)*.3);
  float dPlane = -(p.y - iface); // negative above the line (oil on top)

  float d = dPlane;
  for(int i=0;i<24;i++){
    vec4 drop=uDrops[i];if(drop.z<=0.0)continue;
    float dd=length(p-drop.xy)-drop.z;
    if(drop.w>0.0)d=smin(d,dd,.075);
    else d=-smin(-d,dd,.075);
  }
  return d;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = rot2(uTilt) * uv * 1.8;
  float t = uTime;

  float d = oilField(p, t);
  float oil = smoothstep(0.006, -0.006, d);

  // Normals for gloss
  vec2 e = vec2(0.005, 0.0);
  vec2 grad = vec2(
    oilField(p + e.xy, t) - oilField(p - e.xy, t),
    oilField(p + e.yx, t) - oilField(p - e.yx, t)
  ) / (2.0 * e.x);
  vec3 n = normalize(vec3(-grad * 1.6, 1.0));
  vec3 L = normalize(vec3(-0.4, 0.8, 0.5));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);

  // Water: deep gradient; Oil: warm translucent with inner glow.
  vec3 water = mix(uC2 * 0.5, uC2, smoothstep(-1.0, 0.4, p.y));
  water += uC2 * 0.12 * fbm(p * 3.0 + vec2(0.0, -t * 0.1));
  vec3 oilCol = mix(uC1, uC3, smoothstep(-0.1, 0.8, p.y) * 0.5);
  oilCol *= 0.85 + 0.3 * fbm(p * 2.5 + vec2(t * 0.05, 0.0));

  vec3 col = mix(water, oilCol, oil);
  // Bright interface line
  float edge = smoothstep(0.02, 0.0, abs(d));
  col += uC3 * edge * (0.4 + uIntensity * 0.4);
  col += vec3(1.0) * spec * edge * 1.4 * uIntensity;
  col += vec3(1.0) * spec * oil * 0.35;

  float vig = 1.0 - 0.35 * dot(uv, uv);
  col = mix(uBg, col, vig);
  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const data = new Float32Array(24 * 4),
    drops = []
  let tilt = 0,
    targetTilt = 0,
    tiltVelocity = 0,
    slosh = 0.025,
    grip = null
  const v = shaderVisual(container, opts, meta, FRAG, {
    uDrops: { value: data },
    uTilt: { value: 0 },
    uSlosh: { value: slosh },
  })
  v.addSlider('Viscosity', 'viscosity', 0.5, 4, 0.1, 1.5)
  function shake() {
    drops.length = 0
    for (let i = 0; i < 16; i++) {
      const kind = i % 2 ? 1 : -1
      drops.push({
        x: (Math.random() - 0.5) * 0.9,
        y: -kind * (0.15 + Math.random() * 0.6),
        r: 0.03 + Math.random() * 0.045,
        kind,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.4,
      })
    }
    slosh = 0.14
  }
  shake()
  const clear = v.addAction('Shake layers', shake)
  v.addAction('Let it settle', () => {
    targetTilt = 0
    slosh = 0.01
    drops.forEach((d) => (d.vx = d.vy = 0))
  })
  function point(e) {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight),
      x = (e.u - 0.5) * aspect * 1.8,
      y = (e.v - 0.5) * 1.8
    return {
      x: Math.cos(tilt) * x + Math.sin(tilt) * y,
      y: -Math.sin(tilt) * x + Math.cos(tilt) * y,
    }
  }
  v.onPointer((e) => {
    if (e.type === 'down') grip = { x: e.x, tilt: targetTilt }
    if (e.type === 'drag' && grip) {
      targetTilt = Math.max(
        -0.8,
        Math.min(0.8, grip.tilt + ((e.x - grip.x) / container.clientWidth) * 2),
      )
      slosh = Math.min(
        0.18,
        slosh + (Math.hypot(e.dx, e.dy) / container.clientHeight) * 0.12,
      )
      const p = point(e)
      for (const d of drops) {
        const influence = Math.exp(-Math.hypot(p.x - d.x, p.y - d.y) * 7)
        d.vx += (e.dx / container.clientWidth) * 2 * influence
        d.vy -= (e.dy / container.clientHeight) * 2 * influence
      }
    }
    if (e.type === 'tap') {
      const p = point(e),
        drop = { ...p, r: 0.06, kind: p.y < 0 ? 1 : -1, vx: 0, vy: 0 }
      const index = drops.findIndex((d) => d.r === 0)
      if (index >= 0) drops[index] = drop
      else if (drops.length < 24) drops.push(drop)
      else {
        drops.shift()
        drops.push(drop)
      }
    }
    if (e.type === 'up') {
      grip = null
      targetTilt = 0
    }
  })
  v.onFrame((dt, t, state) => {
    const step = Math.min(dt, 0.03)
    tiltVelocity += (targetTilt - tilt) * step * 12
    tiltVelocity *= Math.exp(-step * 4)
    tilt += tiltVelocity * step
    if (state.paused && grip) tilt = targetTilt
    slosh *= Math.exp(-dt * 0.55)
    for (let i = 0; i < 24; i++) {
      const d = drops[i]
      if (!d) {
        data[i * 4 + 2] = 0
        continue
      }
      if (d.r > 0 && dt > 0) {
        d.vy += d.kind * 0.18 * step
        d.vx *= Math.exp(-step * state.viscosity)
        d.vy *= Math.exp(-step * state.viscosity)
        d.x += d.vx * step
        d.y += d.vy * step
        if (Math.abs(d.x) > 0.8) {
          d.x = Math.sign(d.x) * 0.8
          d.vx *= -0.4
        }
        const interfaceY =
          slosh *
          (Math.sin(d.x * 5 + t * 2) * 0.7 + Math.sin(d.x * 9 - t * 1.3) * 0.3)
        if (
          (d.kind > 0 && d.y > interfaceY + d.r) ||
          (d.kind < 0 && d.y < interfaceY - d.r)
        )
          d.r = 0
      }
      data.set([d.x, d.y, d.r, d.kind], i * 4)
    }
    v.uniforms.uTilt.value = tilt
    v.uniforms.uSlosh.value = slosh
    clear.textContent =
      'Shake layers · ' + drops.filter((d) => d.r > 0).length + ' droplets'
  })
  return v.start()
}
