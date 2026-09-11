// Regenerate real, local preview images. Start Vite first; then run this script.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { manifest } from '../src/manifest.js'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4173/StimTok/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 720 } })
await mkdir(new URL('../public/thumbs/', import.meta.url), { recursive: true })
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  for (const item of manifest) {
    if (
      process.env.STIMTOK_PREVIEW_IDS &&
      !process.env.STIMTOK_PREVIEW_IDS.split(',').includes(item.id)
    )
      continue
    await page.goto(`${base}#/${item.id}`)
    const canvas = page.locator('#stage canvas')
    await canvas.waitFor()
    await page.waitForTimeout(800)
    const rect = await canvas.boundingBox()
    if (['046-sand-mandala-rake', '102-bloom-brush'].includes(item.id)) {
      for (let row = 0; row < 3; row++) {
        await page.mouse.move(
          rect.x + rect.width * 0.2,
          rect.y + rect.height * (0.28 + row * 0.2),
        )
        await page.mouse.down()
        for (let i = 1; i <= 30; i++)
          await page.mouse.move(
            rect.x + rect.width * (0.2 + (i / 30) * 0.6),
            rect.y +
              rect.height *
                (0.28 + row * 0.2 + Math.sin((i / 30) * Math.PI * 2) * 0.08),
          )
        await page.mouse.up()
      }
    }
    if (item.id === '047-playdoh-extruder') {
      await page.locator('[data-action="toggle-panel"]').click()
      for (let i = 0; i < 4; i++)
        await page.getByRole('button', { name: 'Press', exact: true }).click()
      await page.locator('[data-action="toggle-panel"]').click()
      await page.waitForTimeout(2000)
    }
    if (item.id === '069-spirograph-loop') await page.waitForTimeout(30000)
    if (item.id === '091-lightning-branch-loop')
      await page.mouse.click(
        rect.x + rect.width * 0.65,
        rect.y + rect.height * 0.65,
      )
    await page.waitForTimeout(450)
    const thumb = await canvas.evaluate((c) => {
      const small = document.createElement('canvas')
      small.width = 320
      small.height = 240
      const ctx = small.getContext('2d')
      const side = Math.min(c.width / 4, c.height / 3)
      ctx.drawImage(
        c,
        (c.width - side * 4) / 2,
        (c.height - side * 3) / 2,
        side * 4,
        side * 3,
        0,
        0,
        320,
        240,
      )
      return small.toDataURL('image/webp', 0.82).split(',')[1]
    })
    await writeFile(
      new URL(`../public/thumbs/${item.id}.webp`, import.meta.url),
      Buffer.from(thumb, 'base64'),
    )
    console.log(item.id)
  }
} finally {
  await browser.close()
}
