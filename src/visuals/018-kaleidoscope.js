import { shaderVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '018-kaleidoscope',
  title: 'Infinite Kaleidoscope',
  interaction:
    'Drag to rotate the glass · choose a mirror count to change the symmetry',
  palettes: [
    {
      name: 'Jewel Box',
      c1: '#ff2975',
      c2: '#00d9c0',
      c3: '#ffd166',
      bg: '#0a0510',
    },
    {
      name: 'Stained Glass',
      c1: '#4a7cf7',
      c2: '#a855f7',
      c3: '#f97316',
      bg: '#080510',
    },
    {
      name: 'Soft Opal',
      c1: '#ffc4dd',
      c2: '#a0e7e5',
      c3: '#fbf8cc',
      bg: '#100a14',
    },
  ],
}

const FRAG = `
uniform float uMirrors; uniform float uRotation; uniform float uZoom;
void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  // Polar mirror fold: N wedges, mirrored.
  float N = uMirrors;
  float a = atan(uv.y, uv.x) + uRotation;
  float r = length(uv);
  float wedge = 6.28318 / N;
  a = mod(a, wedge);
  a = abs(a - wedge * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;

  // Slowly evolving source pattern sampled through the fold.
  float t = uTime * 0.15;
  vec2 q = p * uZoom;
  q = rot2(t * 0.5) * q;
  q += vec2(sin(t * 0.7), cos(t * 0.9)) * 0.8;


  float f1 = fbm(q + fbm(q * 1.5 + t) * 1.2);
  float f2 = fbm(q * 2.2 - t * 0.6 + 30.0);
  float rings = 0.5 + 0.5 * sin(r * 18.0 - t * 4.0 + f1 * 6.0);


  vec3 col=uBg;
  for(int i=0;i<15;i++){
    float fi=float(i);
    vec2 center=hash22(vec2(fi,3.1))*3.4-1.0;
    float radius=.08+hash21(vec2(fi,9.2))*.22;
    vec2 rel=q-center;
    float shard=max(abs(rel.x)*.75+abs(rel.y),length(rel)*.7)-radius;
    float fill=1.0-smoothstep(-.015,.015,shard);
    vec3 tint=mix(uC1,uC2,hash21(vec2(fi,4.2)));
    tint=mix(tint,uC3,step(.7,hash21(vec2(fi,8.2))));
    col=mix(col,tint*(.55+.35*rel.y/max(radius,.01)),fill*.85);
    col+=tint*exp(-abs(shard)*180.0)*.4;
    col+=vec3(.7)*exp(-length(rel-vec2(-radius*.25,radius*.4))*130.0)*fill;
  }
  // Bright seams along the mirror edges — the "glass shard" look
  float seam = exp(-abs(a - 0.001) * 60.0) + exp(-abs(a - wedge * 0.5) * 60.0);
  col += (uC1 + uC3) * 0.035 * seam * (0.5 + uIntensity * 0.5);

  // Sparkle highlights
  float spark = pow(fbm(q * 5.0 + t * 2.0), 6.0);
  col += vec3(1.0) * spark * uIntensity * 1.2;

  // Center glow and edge falloff
  col *= 1.0 - smoothstep(0.55, 0.95, r);
  col += uC2 * exp(-r * 6.0) * 0.35;

  gl_FragColor = vec4(col * (0.6 + uIntensity * 0.55), 1.0);
}
`

export function mount(container, opts = {}) {
  const v = shaderVisual(container, opts, meta, FRAG, {
    uMirrors: { value: 8 },
    uRotation: { value: 0 },
    uZoom: { value: 3 },
  })
  let rotation = 0
  for (const count of [4, 6, 8, 12])
    v.addAction(count + ' mirrors', () => (v.uniforms.uMirrors.value = count))
  v.addSlider('Magnification', 'zoom', 1.5, 5, 0.1, 3)
  v.onPointer((e) => {
    if (e.type === 'drag') rotation += (e.dx / container.clientWidth) * 4
  })
  v.onFrame(() => {
    v.uniforms.uRotation.value = rotation
    v.uniforms.uZoom.value = v.state.zoom
  })
  return v.start()
}
