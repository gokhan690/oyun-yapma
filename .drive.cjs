/* Tarayıcı doğrulaması: onboarding 5 adım + otomatik açılış + 6 sekme + alt sekmeler */
const { chromium } = require('playwright')

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

;(async () => {
  const browser = await chromium.launch({ executablePath: EXE })
  const page = await browser.newPage({ viewport: { width: 420, height: 880 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // ── 1) Taze profil: onboarding 5 adımı sürülür ──
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  const obSteps = []
  for (let i = 0; i < 8; i++) {
    const card = page.locator('.onboarding-card')
    if (!(await card.count())) break
    const title = (await card.locator('.onboarding-title').textContent().catch(() => '')) ?? ''
    obSteps.push(title.trim().slice(0, 40))
    // Bir seçenek seç (varsa) sonra ileri/başla
    const choice = card.locator('.onboarding-country-btn, .onboarding-lang-btn').first()
    if (await choice.count()) await choice.click()
    const next = card.locator('.onboarding-next-btn, .onboarding-start-btn').first()
    if (await next.count()) await next.click()
    await page.waitForTimeout(500)
  }
  console.log('onboarding steps:', JSON.stringify(obSteps))

  // ── 2) Karakter/zorluk modalları (eski oyun akışı) ──
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('.modal-scrim button').first()
    if (!(await btn.count().catch(() => 0))) break
    const visible = await btn.isVisible().catch(() => false)
    if (!visible) break
    const txt = ((await btn.textContent().catch(() => '')) ?? '').trim().slice(0, 30)
    console.log('modal click:', txt)
    await btn.click().catch(() => {})
    await page.waitForTimeout(600)
  }

  // ── 3) Intro bypass + otomatik açılış kontrolü ──
  await page.evaluate(() => {
    const st = window.__II_REF_STATE__
    if (st) st.onboardingComplete = true
  })
  await page.waitForTimeout(1500)
  const overlayVisible = await page.locator('#ref-test-overlay').isVisible().catch(() => false)
  console.log('auto-open overlay:', overlayVisible)

  if (!overlayVisible) {
    const btn = page.locator('#ref-test-launch')
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(800)
      console.log('manual open:', await page.locator('#ref-test-overlay').isVisible())
    }
  }

  // ── 4) 6 sekme ──
  const navLabels = await page.locator('.ref-nav-btn .ref-nav-btn__lbl').allTextContents()
  console.log('nav tabs:', JSON.stringify(navLabels))

  // İmparatorluk: 3 alt sekme
  await page.locator('.ref-nav-btn', { hasText: 'İmparatorluk' }).click()
  await page.waitForTimeout(500)
  const empTabs = await page.locator('.ref-empire-page .ref-subtabs .ref-main-tab').allTextContents()
  console.log('empire subtabs:', JSON.stringify(empTabs))
  await page.screenshot({ path: '/tmp/shot-empire-manage.png' })

  await page.locator('.ref-empire-page .ref-main-tab', { hasText: 'Dünya' }).click()
  await page.waitForTimeout(400)
  const torpilRows = await page.locator('.ref-torpil-row').count()
  const rushvet = await page.locator('.ref-rushvet-panel').count()
  console.log('world: torpil rows =', torpilRows, ', rushvet panel =', rushvet)
  await page.screenshot({ path: '/tmp/shot-empire-world.png' })

  await page.locator('.ref-empire-page .ref-main-tab', { hasText: 'Rakipler' }).click()
  await page.waitForTimeout(400)
  const rivalCards = await page.locator('.ref-rival-card').count()
  console.log('rival cards:', rivalCards)
  await page.screenshot({ path: '/tmp/shot-empire-rivals.png' })

  // Firmalar: İmparatorluk Yatırımları 6 kategori
  await page.locator('.ref-nav-btn', { hasText: 'Firmalar' }).click()
  await page.waitForTimeout(500)
  await page.locator('.ref-firms-page .ref-main-tab', { hasText: 'İmparatorluk' }).click()
  await page.waitForTimeout(400)
  const empInvTabs = await page.locator('.ref-empire-tabs .ref-empire-tab').allTextContents()
  console.log('firms empire categories:', JSON.stringify(empInvTabs))
  const buyBtns = await page.locator('.ref-empire-card [data-buy]').count()
  console.log('empire buy buttons:', buyBtns)
  await page.screenshot({ path: '/tmp/shot-firms-empire.png' })

  // Yaşam: 5 alt sekme
  await page.locator('.ref-nav-btn', { hasText: 'Yaşam' }).click()
  await page.waitForTimeout(500)
  const lifeTabs = await page.locator('.ref-life-page .ref-subtabs .ref-main-tab').allTextContents()
  console.log('life subtabs:', JSON.stringify(lifeTabs))
  await page.locator('.ref-life-page .ref-main-tab', { hasText: 'Ev&Araç' }).click()
  await page.waitForTimeout(400)
  const resRows = await page.locator('.ref-life-item-row').count()
  console.log('home rows:', resRows)
  await page.screenshot({ path: '/tmp/shot-life-home.png' })

  // No-rebuild kanıtı: probe düğümü sekme geçişinde hayatta kalmalı
  await page.evaluate(() => {
    document.querySelector('.ref-life-page .ref-life-item-row')?.setAttribute('data-probe', '1')
  })
  await page.locator('.ref-life-page .ref-main-tab', { hasText: 'Hanedan' }).click()
  await page.waitForTimeout(300)
  await page.locator('.ref-life-page .ref-main-tab', { hasText: 'Ev&Araç' }).click()
  await page.waitForTimeout(300)
  const probeAlive = await page.locator('[data-probe="1"]').count()
  console.log('no-rebuild probe alive:', probeAlive === 1)

  // Kariyer: 3 alt sekme
  await page.locator('.ref-nav-btn', { hasText: 'Kariyer' }).click()
  await page.waitForTimeout(400)
  const careerTabs = await page.locator('.ref-career-page .ref-subtabs .ref-main-tab').allTextContents()
  console.log('career subtabs:', JSON.stringify(careerTabs))

  // Piyasa: 3 alt sekme
  await page.locator('.ref-nav-btn', { hasText: 'Piyasa' }).click()
  await page.waitForTimeout(400)
  const marketTabs = await page.locator('.ref-market-page .ref-subtabs .ref-main-tab').allTextContents()
  console.log('market subtabs:', JSON.stringify(marketTabs))

  // Header: 🏆 Başarımlar → geri; 🔔 Bildirimler → geri; avatar → Profil → geri
  await page.locator('[data-hdr="ach"]').click()
  await page.waitForTimeout(400)
  console.log('ach page title:', await page.locator('.ref-page-title__text').textContent())
  await page.locator('.ref-back-btn').first().click()
  await page.waitForTimeout(300)

  await page.locator('[data-hdr="notifs"]').click()
  await page.waitForTimeout(400)
  console.log('notifs page title:', await page.locator('.ref-page-title__text').textContent())
  const notifRows = await page.locator('.ref-notif-row').count()
  console.log('notif rows:', notifRows)
  await page.screenshot({ path: '/tmp/shot-notifs.png' })
  await page.locator('.ref-back-btn').first().click()
  await page.waitForTimeout(300)

  await page.locator('.ref-header__left--clickable').click()
  await page.waitForTimeout(400)
  console.log('profile page title:', await page.locator('.ref-page-title__text').textContent())
  const profileBack = await page.locator('.ref-profile-page .ref-back-btn').count()
  console.log('profile back button:', profileBack === 1)
  await page.locator('.ref-back-btn').first().click()
  await page.waitForTimeout(300)
  console.log('back to title:', await page.locator('.ref-page-title__text').textContent())

  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none')
  await browser.close()
  process.exit(0)
})().catch((e) => { console.error('DRIVE FAIL:', e.message); process.exit(1) })
