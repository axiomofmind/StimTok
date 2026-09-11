import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '076-melting-gradient-morph',
  title: 'Melting Gradient Blob Morph',
  interaction: 'Drag the melting field sideways · press to swirl it',
  palettes: [
    { name: 'Wax Melt', c1: '#ff6b9d', c2: '#ffc145', c3: '#7a2a6a', bg: '#12081a' },
    { name: 'Glacier Melt', c1: '#7dd3fc', c2: '#c4b5fd', c3: '#1a4a6a', bg: '#06101a' },
    { name: 'Lime Melt', c1: '#a8e05f', c2: '#fde68a', c3: '#2a6a3a', bg: '#08120a' },
  ],
}

const N = 6

// Smooth-min union of drifting blobs: they stretch into each other and pull
// apart with gooey necks, like a slow-motion wax melt.
const FRAG = `
uniform vec3 uBlobs[${N}]; // xy center, z radius

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float field(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < ${N}; i++) {
    vec3 b = uBlobs[i];
    float di = length(p - b.xy) - b.z;
    d = smin(d, di, 0.22);
  }
  return d;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  vec2 p = uv * 2.0;

  // Slight vertical drip warp: the whole field sags downward over time.
  p.y += 0.04 * fbm(vec2(p.x * 2.0, uTime * 0.1));

  float d = field(p);
  float body = smoothstep(0.012, -0.012, d);

  // Normal from the SDF for soft 3D shading.
  vec2 e = vec2(0.005, 0.0);
  vec2 g = vec2(field(p + e.xy) - field(p - e.xy), field(p + e.yx) - field(p - e.yx)) / (2.0 * e.x);
  vec3 n = normalize(vec3(-g * 1.4, 1.0));

  vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
  float diff = max(dot(n, L), 0.0);
  float rim = pow(1.0 - n.z, 2.5);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 34.0);

  // Interior gradient driven by position and depth into the blob.
  float depth = smoothstep(0.0, -0.35, d);
  vec3 inner = mix(uC1, uC2, 0.5 + 0.5 * sin(p.x * 1.2 + p.y * 0.8 + uTime * 0.2));
  inner = mix(inner, uC3, depth * 0.55);
  inner *= 0.6 + diff * 0.6;
  inner += uC2 * rim * 0.5;
  inner += vec3(1.0) * spec * (0.4 + uIntensity * 0.5);

  // Outer glow so the blobs feel luminous rather than cut out.
  float glow = exp(-max(d, 0.0) * 5.0);
  vec3 col = uBg + mix(uC1, uC3, 0.5) * glow * 0.2 * (0.5 + uIntensity * 0.7);
  col = mix(col, inner, body);

  float vig = 1.0 - 0.32 * dot(uv, uv);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

export function mount(container, opts = {}) {
  const data = new Float32Array(N * 3)
  const blobs = []
  for (let i = 0; i < N; i++) {
    blobs.push({
      ax: 0.35 + Math.random() * 0.5,
      ay: 0.3 + Math.random() * 0.45,
      fx: 0.07 + Math.random() * 0.09,
      fy: 0.09 + Math.random() * 0.1,
      px: Math.random() * 6.28,
      py: Math.random() * 6.28,
      r: 0.20 + Math.random() * 0.16,
    })
  }

  const v = shaderVisual(container, opts, meta, FRAG, { uBlobs: { value: data } })

  v.onFrame((dt, t, state) => {
    for (let i = 0; i < N; i++) {
      const b = blobs[i]
      data[i * 3] = Math.sin(t * b.fx * 6.28 + b.px) * b.ax
      data[i * 3 + 1] = Math.sin(t * b.fy * 6.28 + b.py) * b.ay
      data[i * 3 + 2] = b.r * (0.85 + 0.15 * Math.sin(t * 0.5 + i * 1.7))
    }
  })

  return v.start()
}
