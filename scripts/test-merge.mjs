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

// 1) Açılış kartı ve tahtanın en-boy oranı
const startText = (await page.locator('#start').textContent())?.trim()
if (startText !== 'Başla') errors.push(`Açılış düğmesi beklenmedik: ${startText}`)
const box = await page.locator('#board').boundingBox()
if (!box) {
  console.log('Tuval bulunamadı')
  await browser.close()
  process.exit(1)
}
const ratio = box.width / box.height
if (Math.abs(ratio - 440 / 660) > 0.01) errors.push(`Tahta oranı bozuk: ${ratio.toFixed(3)}`)

await page.locator('#start').click()

async function drop(ratioX) {
  await page.mouse.move(box.x + box.width * ratioX, box.y + box.height * 0.1)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(400)
}

// 2) Meyve düşür → birleşme → puan → "en büyük" rozeti
for (let i = 0; i < 26; i++) await drop(0.25 + (0.5 * ((i * 3) % 7)) / 7)
await page.waitForTimeout(1500)

const score = Number(await page.locator('#score').textContent())
if (score <= 0) errors.push(`Birleşme olmadı, skor=${score}`)
if (!(await page.locator('#biggest-box').isVisible())) errors.push('En büyük meyve rozeti görünmedi')

// 3) Yardımcılar: takas sıradaki meyveyi değiştirir, bomba kurulur
const nextBefore = await page.locator('#next-fruit').screenshot()
await page.locator('#swap').click()
await page.waitForTimeout(300)
const nextAfter = await page.locator('#next-fruit').screenshot()
if (nextBefore.equals(nextAfter)) errors.push('Takas sıradaki meyveyi değiştirmedi')
if ((await page.locator('#swap-count').textContent()) !== '2') errors.push('Takas hakkı düşmedi')

await page.locator('#bomb').click()
await page.waitForTimeout(200)
if (!(await page.locator('#bomb').evaluate((e) => e.classList.contains('armed')))) errors.push('Bomba kurulmadı')
await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.95)
await page.waitForTimeout(500)
if ((await page.locator('#bomb-count').textContent()) !== '0') errors.push('Bomba hakkı düşmedi')

// 4) Kayıt/geri yükleme (otomatik kayıt 3 sn'de bir)
await page.waitForTimeout(3300)
const before = Number(await page.locator('#score').textContent())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const resumeText = (await page.locator('#start').textContent())?.trim()
if (resumeText !== 'Devam Et') errors.push(`Kayıt sonrası düğme beklenmedik: ${resumeText}`)
const after = Number(await page.locator('#score').textContent())
if (after < before) errors.push(`Kayıt geri yüklenemedi: ${before} → ${after}`)

// 5) Reklam kodu sızmamış olmalı
const adTraces = await page.evaluate(() =>
  [...document.querySelectorAll('script')].map((s) => s.src).filter((s) => /admob|googlesyndication|doubleclick/i.test(s)),
)
if (adTraces.length > 0) errors.push(`Reklam scripti bulundu: ${adTraces.join(', ')}`)

console.log('URL:', url)
console.log('tahta:', `${Math.round(box.width)}x${Math.round(box.height)}`, '| skor:', score)
console.log('kayıt:', before, '→', after)
console.log('errors:', errors)

await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
