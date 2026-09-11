import { canvasVisual, makeNoise2D } from '../lib/visual-kit.js'
export const meta = {
  intensityControl: false,
  id: '043-ink-fluid-art',
  title: 'Abstract Fluid Art / Ink Diffusion',
  interaction:
    'Drag to redirect the metallic current · stir in circles to curl the pigment · Tune adjusts flow and sheen',
  palettes: [
    {
      name: 'Ink & Gold',
      c1: '#1a1a2e',
      c2: '#d4af37',
      c3: '#e8e4da',
      bg: '#f0ece2',
    },
    {
      name: 'Ocean Ink',
      c1: '#0d3b66',
      c2: '#3fb8af',
      c3: '#f0f4f8',
      bg: '#dce8f0',
    },
    {
      name: 'Blood Orange',
      c1: '#5c0e14',
      c2: '#ff6b35',
      c3: '#ffe8d6',
      bg: '#f5e8dc',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta),
    noise = makeNoise2D(37)
  function dimensions() {
    const budget = v.state.quality === 'low' ? 160000 : v.state.quality === 'high' ? 450000 : 260000
    const scale = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(budget / (v.size.w * v.size.h)),
    )
    return [Math.max(2, Math.round(v.size.w * scale)), Math.max(2, Math.round(v.size.h * scale))]
  }
  let [W, H] = dimensions()
  let N = W * H
  let vx = new Float32Array(N),
    vy = new Float32Array(N),
    nx = new Float32Array(N),
    ny = new Float32Array(N)
  let colors = [new Float32Array(N), new Float32Array(N), new Float32Array(N)]
  let next = colors.map(() => new Float32Array(N))
  let corrected = colors.map(() => new Float32Array(N))
  let flowX = new Float32Array(W),
    flowY = new Float32Array(H),
    curlX = new Float32Array(W),
    curlY = new Float32Array(H)
  let pressure = new Float32Array(N),
    divergence = new Float32Array(N)
  const image = document.createElement('canvas')
  image.width = W
  image.height = H
  const imageCtx = image.getContext('2d')
  let pixels = imageCtx.createImageData(W, H)
  let pal = meta.palettes[0],
    pigment = 1,
    mode = 'stir',
    changed = true,
    spin = 1,
    priorDx = 0,
    priorDy = 0
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  function reset() {
    vx.fill(0)
    vy.fill(0)
    const inks = [rgb(pal.c1), rgb(pal.c2), rgb(pal.c3)]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        // Keep the pattern's scale independent of simulation quality.
        const px = x * 320 / W, py = y * 320 / W
        const warp =
          noise(px * 0.009, py * 0.009) * 4 + noise(px * 0.022, py * 0.022) * 1.4
        const n = Math.sin(py * 0.085 + px * 0.012 + warp * 3),
          n2 = Math.sin(py * 0.085 + px * 0.012 + warp * 3 + 0.45)
        const a = Math.max(0, Math.min(1, (n + 0.08) * 9)),
          b = Math.max(0, Math.min(1, (n2 - 0.72) * 12))
        for (let c = 0; c < 3; c++)
          colors[c][x + y * W] =
            (inks[0][c] * (1 - a) + inks[1][c] * a) * (1 - b) + inks[2][c] * b
      }
    changed = true
  }
  v.onPalette((p) => {
    pal = p
    reset()
  })
  const stirButton = v.addAction('Stir', () => setMode('stir'))
  const dropButton = v.addAction('Drop ink', () => setMode('drop'))
  function setMode(value) {
    mode = value
    stirButton.setAttribute('aria-pressed', String(mode === 'stir'))
    dropButton.setAttribute('aria-pressed', String(mode === 'drop'))
  }
  for (let i = 0; i < 3; i++)
    v.addAction(['Deep ink', 'Gold / accent', 'Light ink'][i], () => {
      pigment = i
      setMode('drop')
    })
  v.addAction('Fresh marbling', reset)
  v.addSlider('Brush radius', 'radius', 4, 18, 1, 9)
  v.addSlider('Viscosity', 'viscosity', 0.3, 3, 0.1, 1)
  v.addSlider('Current', 'current', 0, 2, 0.05, 0.65)
  v.addSlider('Metallic sheen', 'metallic', 0, 1.5, 0.05, 0.9)
  function add(e) {
    const x = e.u * (W - 1),
      y = (1 - e.v) * (H - 1),
      R = (v.state.radius * W) / 256
    const cross = priorDx * e.dy - priorDy * e.dx
    if (Math.abs(cross) > 0.2) spin = Math.sign(cross)
    priorDx = e.dx
    priorDy = e.dy
    const ink = rgb([pal.c1, pal.c2, pal.c3][pigment])
    for (
      let py = Math.max(1, Math.floor(y - R * 2));
      py < Math.min(H - 1, y + R * 2);
      py++
    )
      for (
        let px = Math.max(1, Math.floor(x - R * 2));
        px < Math.min(W - 1, x + R * 2);
        px++
      ) {
        const dx = px - x,
          dy = py - y,
          k = Math.exp(-(dx * dx + dy * dy) / (R * R)),
          i = px + py * W
        if (k < 0.02) continue
        vx[i] +=
          Math.max(-25, Math.min(25, (e.dx / v.size.w) * W * 8)) * k -
          dy * 0.35 * k * spin
        vy[i] +=
          Math.max(-25, Math.min(25, (e.dy / v.size.h) * H * 8)) * k +
          dx * 0.35 * k * spin
        if (mode === 'drop')
          for (let c = 0; c < 3; c++)
            colors[c][i] += (ink[c] - colors[c][i]) * k * 0.22
      }
    changed = true
  }
  v.onPointer((e) => {
    if (e.type === 'down') {
      priorDx = priorDy = 0
      add(e)
    }
    if (e.type === 'drag') add(e)
  })
  function sample(field, x, y) {
    x = Math.max(0.5, Math.min(W - 1.5, x))
    y = Math.max(0.5, Math.min(H - 1.5, y))
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy,
      i = ix + iy * W
    return (
      (field[i] * (1 - fx) + field[i + 1] * fx) * (1 - fy) +
      (field[i + W] * (1 - fx) + field[i + W + 1] * fx) * fy
    )
  }
  function resizeField() {
    const [newW, newH] = dimensions()
    if (newW === W && newH === H) return
    const resample = (field, factor = 1) => {
      const result = new Float32Array(newW * newH)
      for (let y = 0; y < newH; y++)
        for (let x = 0; x < newW; x++)
          result[x + y * newW] = sample(field, (x + 0.5) * W / newW - 0.5, (y + 0.5) * H / newH - 0.5) * factor
      return result
    }
    colors = colors.map((field) => resample(field))
    vx = resample(vx, newW / W)
    vy = resample(vy, newH / H)
    W = newW
    H = newH
    N = W * H
    nx = new Float32Array(N)
    ny = new Float32Array(N)
    next = colors.map(() => new Float32Array(N))
    corrected = colors.map(() => new Float32Array(N))
    flowX = new Float32Array(W)
    flowY = new Float32Array(H)
    curlX = new Float32Array(W)
    curlY = new Float32Array(H)
    pressure = new Float32Array(N)
    divergence = new Float32Array(N)
    image.width = W
    image.height = H
    pixels = imageCtx.createImageData(W, H)
    changed = true
  }
  v.onFrame((ctx, dt, t, state, w, h) => {
    resizeField()
    if (dt > 0) {
      const damping = Math.exp(-dt * state.viscosity * 0.65)
      for (let x = 0; x < W; x++) {
        flowX[x] = Math.sin((x / W) * 9 + t * 0.08)
        curlX[x] = Math.cos((x / W) * 9 + t * 0.08)
      }
      for (let y = 0; y < H; y++) {
        flowY[y] = Math.cos((y / H) * 9 - t * 0.06)
        curlY[y] = Math.sin((y / H) * 9 - t * 0.06)
      }
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = x + y * W
          nx[i] = Math.max(
            -50,
            Math.min(
              50,
              sample(vx, x - vx[i] * dt, y - vy[i] * dt) * damping +
                (flowX[x] * flowY[y] * dt * state.current * 6 * W) / H,
            ),
          )
          ny[i] = Math.max(
            -50,
            Math.min(
              50,
              sample(vy, x - vx[i] * dt, y - vy[i] * dt) * damping -
                curlX[x] * curlY[y] * dt * state.current * 6,
            ),
          )
        }
      ;[vx, nx] = [nx, vx]
      ;[vy, ny] = [ny, vy]
      pressure.fill(0)
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = x + y * W
          divergence[i] = (vx[i + 1] - vx[i - 1] + vy[i + W] - vy[i - W]) * 0.5
        }
      for (let it = 0; it < 7; it++)
        for (let y = 1; y < H - 1; y++)
          for (let x = 1; x < W - 1; x++) {
            const i = x + y * W
            pressure[i] =
              (pressure[i - 1] +
                pressure[i + 1] +
                pressure[i - W] +
                pressure[i + W] -
                divergence[i]) *
              0.25
          }
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = x + y * W
          vx[i] -= (pressure[i + 1] - pressure[i - 1]) * 0.5
          vy[i] -= (pressure[i + W] - pressure[i - W]) * 0.5
        }
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = x + y * W
          for (let c = 0; c < 3; c++)
            next[c][i] = sample(colors[c], x - vx[i] * dt, y - vy[i] * dt)
        }
      // Forward/backward error correction preserves pigment edges instead of
      // repeatedly blurring them. Clamp to source neighbors to prevent ringing.
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = x + y * W,
            sx = Math.floor(Math.max(0.5, Math.min(W - 1.5, x - vx[i] * dt))),
            sy = Math.floor(Math.max(0.5, Math.min(H - 1.5, y - vy[i] * dt))),
            j = sx + sy * W
          for (let c = 0; c < 3; c++) {
            const f = colors[c],
              low = Math.min(f[j], f[j + 1], f[j + W], f[j + W + 1]),
              high = Math.max(f[j], f[j + 1], f[j + W], f[j + W + 1]),
              reverse = sample(next[c], x + vx[i] * dt, y + vy[i] * dt)
            corrected[c][i] = Math.max(
              low,
              Math.min(high, next[c][i] + (f[i] - reverse) * 0.5),
            )
          }
        }
      for (let c = 0; c < 3; c++) colors[c].set(corrected[c])
      changed = true
    }
    if (changed || state.paused) {
      for (let i = 0; i < N; i++) {
        const left = i % W ? i - 1 : i,
          right = i % W < W - 1 ? i + 1 : i,
          up = i >= W ? i - W : i,
          down = i < N - W ? i + W : i
        // Pigment ridges catch directional light like suspended metal flakes.
        const gx =
            (colors[0][right] +
              colors[1][right] -
              colors[0][left] -
              colors[1][left]) *
            (0.018 * W / 320),
          gy =
            (colors[0][down] +
              colors[1][down] -
              colors[0][up] -
              colors[1][up]) *
            (0.018 * W / 320),
          norm = Math.sqrt(gx * gx + gy * gy + 1),
          light = Math.max(0, (-gx * 0.4 - gy * 0.5 + 0.76) / norm),
          glint = Math.pow(light, 20) * state.metallic * 155,
          shade = 1 + state.metallic * (light - 0.76) * 0.65
        for (let c = 0; c < 3; c++)
          pixels.data[i * 4 + c] = colors[c][i] * shade + glint
        pixels.data[i * 4 + 3] = 255
      }
      imageCtx.putImageData(pixels, 0, 0)
      changed = false
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, w, h)
  })
  return v.start()
}
