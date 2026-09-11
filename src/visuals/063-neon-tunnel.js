import { THREE, shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '063-neon-tunnel',
  title: 'Neon Geometric Tunnel',
  interaction:
    'Drag to bend the tunnel · tap to change its geometry · flick to boost',
  palettes: [
    {
      name: 'Synthwave',
      c1: '#ff2975',
      c2: '#00f0ff',
      c3: '#8a2be2',
      bg: '#050208',
    },
    {
      name: 'Acid Lime',
      c1: '#a8ff2e',
      c2: '#2effd8',
      c3: '#ff8a2e',
      bg: '#040805',
    },
    {
      name: 'Golden Gate',
      c1: '#ffc12e',
      c2: '#ff5d2e',
      c3: '#fff0c0',
      bg: '#0a0502',
    },
  ],
}

const FRAG = `
uniform float uTravel;
uniform float uSides;
uniform float uNextSides;
uniform float uShapeBlend;
uniform float uTwist;
uniform float uBoost;
uniform vec2 uSteer;

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  // Moving the vanishing point bends nearby rings more than distant ones,
  // producing a navigable tube rather than a flat UV offset.
  vec2 farPoint = uSteer * 0.22;
  vec2 p0 = uv - farPoint;
  float radial0 = max(length(p0), 0.001);
  float distanceDownTunnel = 0.34 / radial0;
  vec2 curve = uSteer * (0.16 + 0.11 * sin(distanceDownTunnel * 0.62 + uTravel * 0.12));
  vec2 p = uv - farPoint - curve / (1.0 + distanceDownTunnel * 0.65);

  float r = max(length(p), 0.001);
  float a = atan(p.y, p.x);
  float sides = max(3.0, uSides);
  float sector = 6.2831853 / sides;
  float twist = uTwist + distanceDownTunnel * 0.12 + uTravel * 0.018;
  float twistedAngle = a + twist;

  // The regular-polygon radial profile works for triangles through dodecagons.
  float folded = mod(twistedAngle + sector * 0.5, sector) - sector * 0.5;
  float nextSector=6.2831853/max(3.0,uNextSides);
  float nextFold=mod(twistedAngle+nextSector*.5,nextSector)-nextSector*.5;
  float polygonRadius=mix(r*cos(folded),r*cos(nextFold),smoothstep(0.0,1.0,uShapeBlend));
  float depth = 0.34 / max(polygonRadius, 0.001) + uTravel;
  float phase = fract(depth);
  float ringDistance = min(phase, 1.0 - phase);
  float ringLine = 1.0 - smoothstep(0.008, 0.065, ringDistance);
  float ringGlow = exp(-ringDistance * (9.0 - uBoost * 1.5));

  // Corner rails rotate through space independently of the forward rings.
  float railDistance = abs(mod(twistedAngle + sector * 0.5, sector) - sector * 0.5);
  float rails = 1.0 - smoothstep(0.0, 0.028 + 0.018 / sides, railDistance);
  float railGlow = exp(-railDistance * sides * 2.8);
  float fade = exp(-distanceDownTunnel * 0.115) * (1.0 - smoothstep(0.08, 0.9, r));

  float colorCycle = depth * 0.22 + twistedAngle / 6.2831853;
  vec3 ringColor = mix(uC1, uC2, 0.5 + 0.5 * sin(colorCycle * 6.2831853));
  ringColor = mix(ringColor, uC3, 0.25 + 0.25 * sin(colorCycle * 12.56637 + 1.7));

  vec3 col = uBg;
  col += ringColor * ringLine * fade * (1.1 + uIntensity * 0.75 + uBoost * 0.25);
  col += ringColor * ringGlow * fade * (0.18 + uBoost * 0.08);
  col += uC3 * rails * fade * (0.65 + uIntensity * 0.42);
  col += uC2 * railGlow * fade * 0.075;

  // A hot destination point and a brief chromatic halo sell the speed burst.
  float core = exp(-length(p0) * (18.0 - uBoost * 2.0));
  col += mix(uC1, uC2, 0.55) * core * (0.8 + uBoost * 0.55);
  col += uC3 * exp(-abs(length(p0) - 0.03 - uBoost * 0.008) * 75.0) * uBoost * 0.35;

  gl_FragColor = vec4(col, 1.0);
}
`

export function mount(container, opts = {}) {
  const steer = new THREE.Vector2()
  const targetSteer = new THREE.Vector2()
  const sides = [3, 4, 5, 6, 8, 12]
  let sideIndex = 3
  let shapeBlend = 1,
    priorSides = 6
  let travel = 0
  let velocity = 1.45
  let twist = 0
  let boost = 0

  const v = shaderVisual(container, opts, meta, FRAG, {
    uTravel: { value: 0 },
    uSides: { value: sides[sideIndex] },
    uNextSides: { value: sides[sideIndex] },
    uShapeBlend: { value: 1 },
    uTwist: { value: 0 },
    uBoost: { value: 0 },
    uSteer: { value: steer },
  })

  function changeShape(index) {
    if (shapeBlend < 1) return
    priorSides = sides[sideIndex]
    sideIndex = index
    shapeBlend = 0
  }
  for (const [i, n] of sides.entries())
    v.addAction(n + ' sides', () => changeShape(i))
  v.addSlider('Travel', 'travelSpeed', 0, 2, 0.1, 1)
  v.onPointer((event) => {
    if (event.type === 'down' || event.type === 'drag') {
      targetSteer.set(event.nx, event.ny)
      boost = Math.max(boost, event.down ? 0.38 : 0)
      if (event.type === 'drag')
        twist += (event.dx / Math.max(1, container.clientWidth)) * 1.8
    } else if (event.type === 'tap') {
      changeShape((sideIndex + 1) % sides.length)
      boost = Math.max(boost, 1.1)
    } else if (event.type === 'fling') {
      boost = THREE.MathUtils.clamp(boost + event.speed / 850, 0, 2.2)
      twist += (event.vx / Math.max(1, container.clientWidth)) * 0.24
    } else if (event.type === 'doubletap') {
      sideIndex = 3
      targetSteer.set(0, 0)
      boost = 0
    }
  })

  v.onFrame((dt) => {
    if (!v.pointer.down) targetSteer.multiplyScalar(Math.exp(-dt * 0.5))
    steer.lerp(targetSteer, 1 - Math.exp(-dt * 5.5))

    const cruise = 1.45 + boost * 2.5
    velocity += (cruise - velocity) * (1 - Math.exp(-dt * 4))
    travel += dt * velocity * v.state.travelSpeed
    boost *= Math.exp(-dt * 1.35)
    twist *= Math.exp(-dt * 0.045)

    v.uniforms.uTravel.value = travel
    shapeBlend = Math.min(1, shapeBlend + dt * 2)
    if (shapeBlend === 1) priorSides = sides[sideIndex]
    v.uniforms.uSides.value = priorSides
    v.uniforms.uNextSides.value = sides[sideIndex]
    v.uniforms.uShapeBlend.value = shapeBlend
    v.uniforms.uTwist.value = twist
    v.uniforms.uBoost.value = boost
  })

  return v.start()
}
