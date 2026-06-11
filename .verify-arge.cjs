/* Ar-Ge taşıma doğrulaması: Firmalar'da 2 sekme, İmparatorluk→Yönet'te Araştırma Ağacı */
const { chromium } = require('playwright')

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

;(async () => {
  const browser = await chromium.launch({ executablePath: EXE })
  const page = await browser.newPage({ viewport: { width: 420, height: 880 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  // Onboarding adımlarını geç (varsa)
  for (let i = 0; i < 8; i++) {
    const card = page.locator('.onboarding-card')
    if (!(await card.count())) break
    const choice = card.locator('.onboarding-country-btn, .onboarding-lang-btn').first()
    if (await choice.count()) await choice.click()
    const next = card.locator('.onboarding-next-btn, .onboarding-start-btn').first()
    if (await next.count()) await next.click()
    await page.waitForTimeout(450)
  }
  // Eski oyun modalları (varsa)
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('.modal-scrim button').first()
    if (!(await btn.count().catch(() => 0))) break
    if (!(await btn.isVisible().catch(() => false))) break
    await btn.click().catch(() => {})
    await page.waitForTimeout(500)
  }

  // RefApp otomatik açılışını bekle
  await page.waitForSelector('.ref-bottom-nav', { timeout: 8000 })

  // ── Firmalar sekmesi ──
  await page.locator('.ref-nav-btn', { hasText: 'Firmalar' }).click()
  await page.waitForTimeout(400)
  const firmTabs = await page.locator('.ref-firms-page .ref-main-tab').allTextContents()
  console.log('Firmalar ana sekmeleri:', JSON.stringify(firmTabs))
  await page.screenshot({ path: '/tmp/firmalar.png' })

  // ── İmparatorluk → Yönet ──
  await page.locator('.ref-nav-btn', { hasText: 'İmparatorluk' }).click()
  await page.waitForTimeout(400)
  const hasResearch = await page.locator('.ref-empire-page .ref-sec-title', { hasText: 'Araştırma Ağacı' }).count()
  const hasUpgrades = await page.locator('.ref-empire-page .ref-sec-title', { hasText: 'Yükseltmeler' }).count()
  const rndRows = await page.locator('.ref-empire-page .ref-rnd-row').count()
  console.log('İmparatorluk→Yönet: Araştırma Ağacı başlığı =', hasResearch, '· Yükseltmeler başlığı =', hasUpgrades, '· toplam Ar-Ge satırı =', rndRows)
  // Ar-Ge bölümüne kaydırıp ekran görüntüsü al
  await page.locator('.ref-empire-page .ref-sec-title', { hasText: 'Araştırma Ağacı' }).first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(300)
  await page.screenshot({ path: '/tmp/imparatorluk-arge.png' })

  console.log('JS hataları:', errors.length ? errors : 'yok')
  await browser.close()
})()
