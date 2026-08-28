/**
 * public/merge-icon.svg dosyasını PWA için PNG'lere dönüştürür (192 ve 512).
 * iOS "Ana ekrana ekle" SVG kabul etmediği için PNG şart.
 *   node scripts/gen-merge-icons.mjs
 * PW_CHROMIUM env'i ile chromium yolu geçilebilir.
 */
import fs from 'node:fs'
import { chromium } from 'playwright'

const svg = fs.readFileSync('public/merge-icon.svg', 'utf8')
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  await page.screenshot({ path: `public/merge-icon-${size}.png`, omitBackground: true })
  await page.close()
  console.log(`public/merge-icon-${size}.png yazıldı`)
}

await browser.close()
