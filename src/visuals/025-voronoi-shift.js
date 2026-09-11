import { THREE, shaderVisual } from '../lib/visual-kit.js'
import { readPreference, savePreference } from '../lib/preferences.js'

export const meta = {
  speedControl: false,
  id: '025-voronoi-shift',
  title: 'Voronoi Cell Pattern Shift',
  interaction:
    'Move: drag cell centers · Split: tap to add a cell · Merge: tap to combine neighbors',
  palettes: [
    {
      name: 'Cellular Glow',
      c1: '#4ade80',
      c2: '#166534',
      c3: '#a7f3d0',
      bg: '#04120a',
    },
    {
      name: 'Amethyst',
      c1: '#a78bfa',
      c2: '#4c1d95',
      c3: '#e9d5ff',
      bg: '#0c0518',
    },
    {
      name: 'Copper Foam',
      c1: '#fb923c',
      c2: '#7c2d12',
      c3: '#fed7aa',
      bg: '#120704',
    },
  ],
}

const CAP = 32
const FRAG = `
uniform vec2 uSites[32];
uniform float uCount;
uniform float uSelected;
uniform float uBorder;
void main(){
 vec2 p=vUv; p.x*=uRes.x/max(uRes.y,1.0);
 float first=99.0,second=99.0,id=0.0;
 for(int i=0;i<32;i++){
  if(float(i)>=uCount)break;
  vec2 site=uSites[i];site.x*=uRes.x/max(uRes.y,1.0);
  float d=length(p-site);
  if(d<first){second=first;first=d;id=float(i);}else second=min(second,d);
 }
 float edge=exp(-(second-first)*uBorder);
 float seed=hash21(vec2(id,7.4));
 vec3 tint=mix(uC2,uC1,seed);tint=mix(tint,uC3,seed*seed*.55);
 vec3 col=mix(uBg,tint*.45,exp(-first*5.0));
 col+=uC3*edge*.55*(.4+uIntensity*.5);
 float dotGlow=exp(-first*220.0);
 col+=mix(uC1,uC3,step(abs(id-uSelected),.1))*dotGlow;
 col*=1.0-.35*length(vUv-.5);
 gl_FragColor=vec4(col,1.0);
}
`
export function mount(container, opts = {}) {
  const sites = [],
    uniformSites = Array.from({ length: CAP }, () => new THREE.Vector2())
  let selected = -1,
    mode = 'move'
  const v = shaderVisual(container, opts, meta, FRAG, {
    uSites: { value: uniformSites },
    uCount: { value: 0 },
    uSelected: { value: -1 },
    uBorder: { value: 65 },
  })
  function seed() {
    sites.length = 0
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 5; x++)
        sites.push({
          u: (x + 0.3 + Math.random() * 0.4) / 5,
          v: (y + 0.3 + Math.random() * 0.4) / 4,
        })
    selected = -1
  }
  seed()
  const saved = opts.fresh ? null : readPreference('voronoi-document', null)
  if (Array.isArray(saved) && saved.length >= 3 && saved.length <= CAP)
    sites.splice(0, sites.length, ...saved)
  const persist = () => savePreference('voronoi-document', sites)
  v.addDispose(persist)
  const history = []
  const snapshot = () => {
    history.push(JSON.stringify(sites))
    if (history.length > 20) history.shift()
  }
  const move = v.addAction('Move cells', () => (mode = 'move'))
  v.addAction('Split cells', () => (mode = 'split'))
  v.addAction('Merge cells', () => (mode = 'merge'))
  v.addAction('Undo', () => {
    if (history.length) {
      sites.splice(0, sites.length, ...JSON.parse(history.pop()))
      selected = -1
    }
  })
  v.addAction('New field', () => {
    snapshot()
    seed()
  })
  v.addSlider('Edge softness', 'border', 25, 110, 1, 65)
  function nearest(e) {
    let best = -1,
      d = Infinity
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i],
        dist = Math.hypot(
          (s.u - e.u) * container.clientWidth,
          (s.v - e.v) * container.clientHeight,
        )
      if (dist < d) {
        d = dist
        best = i
      }
    }
    return best
  }
  v.onPointer((e) => {
    if (e.type === 'down') {
      selected = nearest(e)
      snapshot()
    }
    if (e.type === 'up') persist()
    if (e.type === 'drag' && mode === 'move' && selected >= 0) {
      sites[selected].u = Math.max(0.02, Math.min(0.98, e.u))
      sites[selected].v = Math.max(0.02, Math.min(0.98, e.v))
    }
    if (e.type === 'tap' && selected >= 0) {
      const a = sites[selected]
      if (mode === 'split' && sites.length < CAP) {
        a.u = Math.max(0.02, a.u - 0.025)
        sites.push({
          u: Math.min(0.98, a.u + 0.06),
          v: Math.max(0.02, Math.min(0.98, a.v + 0.025)),
        })
      }
      if (mode === 'merge' && sites.length > 3) {
        let j = -1,
          d = Infinity
        sites.forEach((b, i) => {
          const x = Math.hypot(
            (a.u - b.u) * container.clientWidth,
            (a.v - b.v) * container.clientHeight,
          )
          if (i !== selected && x < d) {
            d = x
            j = i
          }
        })
        a.u = (a.u + sites[j].u) / 2
        a.v = (a.v + sites[j].v) / 2
        sites.splice(j, 1)
        selected = -1
      }
    }
  })
  v.onFrame(() => {
    sites.forEach((s, i) => uniformSites[i].set(s.u, s.v))
    v.uniforms.uCount.value = sites.length
    v.uniforms.uSelected.value = selected
    v.uniforms.uBorder.value = v.state.border
    move.textContent = 'Move cells · ' + sites.length
  })
  return v.start()
}
