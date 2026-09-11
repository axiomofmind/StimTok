import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '034-windblown-grass',
  title: 'Wind-Blown Grass Field',
  interaction: 'Drag across the field · tap the grass to pulse it',
  palettes: [
    { name: 'Summer Meadow', base: '#1e5c2a', tip: '#8fd868', sky: '#a8d8f0', bg: '#8fc7e8' },
    { name: 'Golden Prairie', base: '#7a5c1a', tip: '#f0d878', sky: '#f0c8a0', bg: '#e8b88a' },
    { name: 'Dusk Field', base: '#122a3a', tip: '#4a8ac8', sky: '#2a1a3e', bg: '#1e1430' },
  ],
}

// All blades in one instanced draw call; the wind bend happens per-vertex
// in the vertex shader, driven by a travelling sine + noise wave.
const VERT = `
attribute vec3 offset;
attribute float scale;
attribute float phase;
uniform float uTime;
uniform float uWind;
varying float vHeight;
varying float vShade;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vHeight = uv.y;
  // Wind: travelling wave across x plus per-blade jitter.
  float wave = sin(offset.x * 0.35 + offset.z * 0.22 + uTime * 1.4)
             + 0.5 * sin(offset.x * 0.9 - uTime * 2.1 + phase * 6.2831);
  float bend = wave * uWind * uv.y * uv.y;
  vec3 pos = position;
  pos.x += bend * 0.9;
  pos.z += bend * 0.25;
  pos = pos * scale + offset;
  vShade = 0.75 + 0.25 * hash(phase * 91.7);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`
const FRAG_G = `
uniform vec3 uBase;
uniform vec3 uTip;
varying float vHeight;
varying float vShade;
void main() {
  vec3 col = mix(uBase, uTip, vHeight) * vShade;
  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 1.6, 7], lookAt: [0, 1.2, 0], fov: 50 })
  const { scene } = v

  // Blade: narrow tapered quad strip (4 segments for smooth bend).
  const blade = new THREE.PlaneGeometry(0.09, 1.2, 1, 4)
  blade.translate(0, 0.6, 0)

  const COUNT = 5500
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = blade.index
  geo.attributes.position = blade.attributes.position
  geo.attributes.uv = blade.attributes.uv

  const offsets = new Float32Array(COUNT * 3)
  const scales = new Float32Array(COUNT)
  const phases = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 22
    const z = -Math.random() * 12 + 2
    offsets[i * 3] = x
    offsets[i * 3 + 1] = 0
    offsets[i * 3 + 2] = z
    scales[i] = 0.7 + Math.random() * 0.8
    phases[i] = Math.random()
  }
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3))
  geo.setAttribute('scale', new THREE.InstancedBufferAttribute(scales, 1))
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1))

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0.35 },
    uBase: { value: new THREE.Color('#1e5c2a') },
    uTip: { value: new THREE.Color('#8fd868') },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG_G, side: THREE.DoubleSide,
  })
  const grass = new THREE.Mesh(geo, mat)
  grass.frustumCulled = false
  scene.add(grass)

  // Ground + sky gradient sphere
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x143a1a })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), groundMat)
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    uniforms.uBase.value.set(p.base)
    uniforms.uTip.value.set(p.tip)
    groundMat.color.set(new THREE.Color(p.base).multiplyScalar(0.6))
    scene.fog = new THREE.Fog(new THREE.Color(p.sky).getHex(), 9, 20)
  })

  v.onFrame((dt, t, state) => {
    uniforms.uTime.value = t
    uniforms.uWind.value = 0.18 + state.intensity * 0.3
  })

  return v.start()
}
