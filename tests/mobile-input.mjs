import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  const source = await readFile(
    new URL('../src/lib/interaction.js', import.meta.url),
    'utf8',
  )
  const results = await page.evaluate(async (source) => {
    const { createInteraction } = await import(
      'data:text/javascript,' + encodeURIComponent(source)
    )
    const results = []
    for (const interruption of ['lostpointercapture', 'blur']) {
      const host = document.createElement('div'),
        canvas = document.createElement('canvas')
      document.body.append(host)
      host.append(canvas)
      canvas.setPointerCapture = canvas.releasePointerCapture = () => {}
      const input = createInteraction(host, canvas),
        events = []
      input.on((e) => events.push(e.type))
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'touch',
          clientX: 30,
          clientY: 30,
        }),
      )
      if (interruption === 'blur') window.dispatchEvent(new Event('blur'))
      else
        canvas.dispatchEvent(new PointerEvent(interruption, { pointerId: 1 }))
      results.push({
        interruption,
        released: !input.state.down && input.state.contacts.length === 0,
        cancelled: events.includes('cancel'),
        accidentalTap: events.includes('tap') || events.includes('fling'),
      })
      input.dispose()
      host.remove()
    }
    return results
  }, source)
  for (const r of results) {
    assert.ok(r.released && r.cancelled && !r.accidentalTap, JSON.stringify(r))
  }
  console.log(
    'PASS interrupted mobile grabs cancel cleanly without accidental taps or throws',
  )
} finally {
  await browser.close()
}
