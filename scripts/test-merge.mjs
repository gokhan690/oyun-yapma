/**
 * Meyve Birleştir dumanı testi.
 *   node scripts/test-merge.mjs [url]
 * Varsayılan url: http://localhost:5173/merge.html (dev). Preview için :4173 ver.
 * PW_CHROMIUM env'i ile chromium yolu geçilebilir.
 */
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/merge.html'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 430, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

const box = await page.locator('#board').boundingBox()
if (!box) {
  console.log('Tuval bulunamadı')
  await browser.close()
  process.exit(1)
}

async function drop(ratio) {
  await page.mouse.move(box.x + box.width * ratio, box.y + 40)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(420)
}

// 1) Meyve düşür → birleşme → puan
for (let i = 0; i < 26; i++) await drop(0.25 + 0.5 * ((i * 3) % 7) / 7)
await page.waitForTimeout(1500)

const score = Number(await page.locator('#score').textContent())
const bodies = await page.evaluate(() => document.querySelectorAll('canvas').length)
const unlocked = await page.locator('.chain-item.seen').count()
if (score <= 0) errors.push(`Birleşme olmadı, skor=${score}`)
if (unlocked < 6) errors.push(`Zincir ilerlemedi, açılan=${unlocked}`)

// 2) Kayıt/geri yükleme (otomatik kayıt 3 sn'de bir)
await page.waitForTimeout(3300)
const before = Number(await page.locator('#score').textContent())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const after = Number(await page.locator('#score').textContent())
if (after < before) errors.push(`Kayıt geri yüklenemedi: ${before} → ${after}`)

// 3) Reklam kodu sızmamış olmalı
const adTraces = await page.evaluate(() =>
  [...document.querySelectorAll('script')].map((s) => s.src).filter((s) => /admob|googlesyndication|doubleclick/i.test(s)),
)
if (adTraces.length > 0) errors.push(`Reklam scripti bulundu: ${adTraces.join(', ')}`)

console.log('URL:', url)
console.log('skor:', score, '| açılan meyve:', unlocked, '| canvas sayısı:', bodies)
console.log('kayıt:', before, '→', after)
console.log('errors:', errors)

await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
