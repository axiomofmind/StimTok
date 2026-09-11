import { shaderVisual } from '../lib/visual-kit.js'
import { createLavaWax, lampWidth } from '../lib/lava-wax.js'

export const meta = {
  id: '056-lava-lamp',
  title: 'Lava Lamp',
  interaction:
    'Drag a wax blob through the lamp · hold to warm it · release to watch it rise',
  palettes: [
    {
      name: 'Classic Red',
      c1: '#ff4d2e',
      c2: '#ffb02e',
      c3: '#2e0a4a',
      bg: '#0d0512',
    },
    {
      name: 'Blue Goo',
      c1: '#2e8aff',
      c2: '#7df0ff',
      c3: '#0a2a3a',
      bg: '#04101a',
    },
    {
      name: 'Pink Purple',
      c1: '#ff2e9d',
      c2: '#ff8ad0',
      c3: '#2a0a3a',
      bg: '#100518',
    },
  ],
}

const BLOBS = 7

// Metaball field with a vessel mask, heat glow at the base and glass sheen.
const FRAG = `
uniform vec4 uBlobs[${BLOBS}]; // x, y, radius, velocity stretch
uniform float uHeat[${BLOBS}];
uniform float uHeater;

float vesselMask(vec2 p) {
  // Tapered lamp silhouette: narrower at top, rounded shoulders.
  float halfW = mix(0.30, 0.175, smoothstep(-0.62, 0.62, p.y));
  float d = abs(p.x) - halfW;
  float capTop = p.y - 0.62;
  float capBot = -0.62 - p.y;
  return max(d, max(capTop, capBot));
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = uv * 2.6 * max(1.0, 0.55 / (uRes.x / max(uRes.y, 1.0))) - vec2(0.0, 0.12);

  float vd = vesselMask(p);
  float inside = smoothstep(0.008, -0.008, vd);

  // Metaball field
  float field = 0.0;
  vec2 gradient = vec2(0.0);
  float hot = 0.0; // how "hot"/low the contributing blobs are
  for (int i = 0; i < ${BLOBS}; i++) {
    vec4 b = uBlobs[i];
    vec2 bp = p - b.xy;
    // organic wobble on each blob's surface
    float stretch = 1.0 + b.w;
    bp *= vec2(sqrt(stretch), 1.0 / stretch);
    float wob = 1.0 + 0.045 * sin(atan(bp.y, bp.x) * 3.0 + uTime * 0.7 + float(i) * 2.4);
    float r = b.z * wob;
    float q = max(0.0, 1.0 - dot(bp, bp) / (4.0 * r * r));
    float contrib = 2.0 * q * q * q;
    gradient += -3.0 * q * q * bp * vec2(sqrt(stretch), 1.0 / stretch) / (r * r);
    field += contrib;
    hot += contrib * uHeat[i];
  }
  float surfBase = smoothstep(0.67, 0.73, field);
  float core = smoothstep(1.4, 2.6, field);
  float heat = clamp(hot / max(field, 0.001), 0.0, 1.0);

  // Liquid background inside the vessel: warm at base, cool above.
  float baseGlow = exp(-(p.y + 0.62) * 2.4) * (0.7 + 0.3 * sin(uTime * 0.5));
  vec3 liquid = mix(uC3 * 0.25, uC3 * 0.7 + uC1 * 0.08, baseGlow);
  liquid += uC1 * 0.08 * smoothstep(0.4, 0.6, field); // pre-glow near blobs

  // Wax color: hot blobs lean to c1, cooler to c2 blend.
  vec3 wax = mix(uC2, uC1, clamp(heat * 1.4, 0.0, 1.0));
  vec3 normal = normalize(vec3(-gradient * 0.045, 1.4));
  float diffuse = max(0.0, dot(normal, normalize(vec3(-0.5, 0.65, 1.0))));
  float spec = pow(max(0.0, dot(normal, normalize(vec3(-0.35, 0.45, 1.0)))), 28.0);
  wax *= 0.48 + diffuse * 0.7;
  wax += uC2 * core * 0.16 + vec3(1.0, 0.92, 0.8) * spec * 0.28;
  // Rim light on the blob edges
  float rim = smoothstep(0.6, 0.75, field) - smoothstep(0.85, 1.5, field);
  wax += uC2 * rim * 0.45;

  vec3 col = liquid;
  col = mix(col, wax, surfBase);
  col *= inside;

  // Glass highlights: two vertical sheen streaks
  float glassWidth = mix(0.30, 0.175, smoothstep(-0.62, 0.62, p.y));
  float sheenL = exp(-pow((p.x + glassWidth * 0.72) * 95.0, 2.0)) * inside;
  float sheenR = exp(-pow((p.x - glassWidth * 0.83) * 150.0, 2.0)) * inside;
  col += vec3(1.0) * (sheenL * 0.10 + sheenR * 0.05) * (0.5 + uIntensity * 0.5);

  // Metal base and cap
  float baseCap = smoothstep(0.008, -0.008, max(abs(p.x) - 0.34 + (p.y + 0.75) * 0.35, max(-0.85 - p.y, p.y + 0.62)));
  float topCap = smoothstep(0.008, -0.008, max(abs(p.x) - 0.19 + (0.85 - p.y) * 0.25, max(p.y - 0.85, 0.62 - p.y)));
  vec3 metal = vec3(0.32, 0.34, 0.38) * (0.22 + 1.2 * exp(-pow((p.x + 0.06) * 14.0, 2.0)));
  metal += vec3(0.08) * pow(0.5 + 0.5 * sin(p.y * 750.0), 2.0);
  // base glows from the bulb inside
  metal += uC1 * baseCap * exp(-(p.y + 0.85) * 3.0) * 0.6;
  col = mix(col, metal, max(baseCap, topCap) * (1.0 - inside));

  // Bulb glow bleeding out from under the wax
  col += uC1 * inside * exp(-(p.y + 0.62) * 9.0) * (0.12 + 0.14 * uHeater);
  col += vec3(0.45, 0.5, 0.6) * exp(-abs(vd) * 450.0) * 0.28;

  // Ambient halo around the lamp
  float halo = exp(-max(vd, 0.0) * 5.0) * (1.0 - inside) * (1.0 - max(baseCap, topCap));
  col += uC1 * halo * 0.12 * (0.5 + uIntensity * 0.75);
  col += uBg * (1.0 - inside) * (1.0 - max(baseCap, topCap)) * 0.9;
  col += uC1 * exp(-pow(p.x * 3.5, 2.0) - pow((p.y + 0.88) * 45.0, 2.0)) * 0.15;

  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const wax = createLavaWax(),
    blobData = new Float32Array(BLOBS * 4),
    heat = new Float32Array(BLOBS)
  const v = shaderVisual(container, opts, meta, FRAG, {
    uBlobs: { value: blobData },
    uHeat: { value: heat },
    uHeater: { value: 1 },
  })
  v.addSlider('Heater', 'heater', 0.2, 2, 0.1, 1)
  v.addSlider('Wax viscosity', 'viscosity', 0.5, 2, 0.1, 1)
  v.addAction('Warm wax', () => wax.warm(0.35))
  v.addAction('Cool wax', () => wax.warm(-0.35))
  v.onPointer((e) => {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight)
    const scale = 2.6 * Math.max(1, 0.55 / aspect)
    const x = (e.u - 0.5) * aspect * scale,
      y = (e.v - 0.5) * scale - 0.12
    if (e.type === 'down' && Math.abs(y) < 0.62 && Math.abs(x) < lampWidth(y))
      wax.grab(x, y)
    if (e.type === 'drag') wax.drag(x, y, v.state.paused)
    if (e.type === 'up' || e.type === 'cancel') wax.release()
  })
  v.onFrame((dt, t, state) => {
    wax.step(dt, t, state.heater, state.viscosity)
    v.uniforms.uHeater.value = state.heater
    for (let i = 0; i < BLOBS; i++) {
      const b = wax.blobs[i]
      blobData[i * 4] = b.x
      blobData[i * 4 + 1] = b.y
      blobData[i * 4 + 2] = b.r * (0.97 + b.heat * 0.08)
      blobData[i * 4 + 3] = Math.min(0.6, Math.abs(b.vy) * 3)
      heat[i] = b.heat
    }
  })
  return v.start()
}
