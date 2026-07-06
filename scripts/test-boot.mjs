import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const fresh = process.argv.includes('--fresh')

// ---- Kanıtlanmış save-envelope yardımcıları (test-tur15-a3.mjs'ten minimum alt küme) ----
const SAVE_KEY = 'is_imparatorlugu_save_v10'
const OBFUSCATION_KEY = 'PT2026x'
const VERSION = 10

function computeChecksum(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function obfuscate(text) {
  const data = new TextEncoder().encode(text)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
  return Buffer.from(out).toString('base64')
}

function deobfuscate(encoded) {
  const data = Buffer.from(encoded, 'base64')
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
  return new TextDecoder().decode(out)
}

function encodeSave(data) {
  const json = JSON.stringify(data)
  return JSON.stringify({ payload: obfuscate(json), checksum: computeChecksum(json), version: VERSION })
}

function decodeSave(raw) {
  const envelope = JSON.parse(raw)
  const json = deobfuscate(envelope.payload)
  if (computeChecksum(json) !== envelope.checksum) throw new Error('bad checksum')
  return JSON.parse(json)
}

// ---- Kanıtlanmış state-expose route patch'i (test-tur15-a2.mjs'ten minimum alt küme) ----
// Yalnız --fresh moddaki kariyer-aksiyon eşiğini geçmek için (bkz. aşağı) kullanılır;
// production dosyası değişmez, yalnız Playwright fetch response'u içinde bir satır eklenir.
async function instrumentContext(context) {
  await context.route('**/src/main.ts*', async (route) => {
    const response = await route.fetch()
    const text = await response.text()
    let body = text
    if (body.includes('const state = new GameState();')) {
      body = body.replace('const state = new GameState();', 'const state = new GameState();\nglobalThis.__tur15State = state;')
    } else if (body.includes('const state = new GameState()')) {
      body = body.replace('const state = new GameState()', 'const state = new GameState();\nglobalThis.__tur15State = state;')
    } else {
      throw new Error('test-boot route patch: state construction anchor not found')
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
}

// ---- Kanıtlanmış onboarding tamamlama yardımcıları (test-tur15-a3.mjs'ten minimum alt küme) ----
async function clickNext(page) {
  await page.locator('.onboarding-next-btn').first().click()
}

async function chooseVisible(page, re) {
  const btn = page.locator('.onboarding-country-btn').filter({ hasText: re }).first()
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

async function completeOnboarding(page) {
  await page.waitForSelector('.onboarding-overlay')
  const english = page.locator('.onboarding-lang-btn').filter({ hasText: /English/i }).first()
  if (await english.isVisible().catch(() => false)) await english.click()
  await clickNext(page)
  await clickNext(page)
  await page.locator('.ob-name-input').fill('Baron')
  await clickNext(page)
  await clickNext(page)
  await chooseVisible(page, /Doctorate|Doktora/i)
  await clickNext(page)
  await chooseVisible(page, /Athlete|Sporcu/i)
  await clickNext(page)
  await clickNext(page)
  await page.locator('.onboarding-start-btn').click()
  await page.waitForSelector('.ref-shell', { timeout: 20000 })
}

// ---- Kanıtlanmış RefApp navigasyon yardımcıları (test-tur15-a1/a2/a3.mjs'ten minimum alt küme) ----
async function goTab(page, re) {
  await page.locator('.ref-bottom-nav .ref-nav-btn').filter({ hasText: re }).first().click()
}

async function waitForBootSettled(page) {
  await page.waitForFunction(() => (
    !!document.querySelector('.ref-bottom-nav')
    || !!document.querySelector('.onboarding-overlay')
    || !!document.querySelector('#boot-error')
  ), null, { timeout: 15000 }).catch(() => {})
}

async function readBootChecks(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app')
    return {
      appEmpty: !app || app.children.length === 0,
      bootError: document.querySelector('#boot-error')?.textContent || '',
      // Güncel prodüksiyon kabuğu (RefApp): .ref-shell kök elemanı + .ref-bottom-nav
      // navigasyonu — eski .bottom-nav/.tap-area (HUD.ts) artık mount edilmiyor.
      hasHud: !!document.querySelector('.ref-shell') && !!document.querySelector('.ref-bottom-nav'),
      title: document.querySelector('h1')?.textContent || '',
      onboardingOpen: !!document.querySelector('.onboarding-overlay'),
      appPreview: app?.innerHTML?.slice(0, 200) || '',
    }
  })
}

const browser = await chromium.launch()
const errors = []
let context

if (!fresh) {
  // Normal mod — "geçerli kaydı bulunan geri dönen kullanıcı doğrudan HUD'a
  // açılır." Gerçek onboarding'i bir kez tamamlayıp üretilen geçerli save
  // envelope'unu (onboardingComplete/tutorialDone true ile) seed'liyoruz;
  // baron_setup_done'a HİÇ dokunulmuyor, hiçbir karar bu flag'e dayanmıyor.
  const seedContext = await browser.newContext({ serviceWorkers: 'block' })
  const seedPage = await seedContext.newPage()
  await seedPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await completeOnboarding(seedPage)
  const rawSave = await seedPage.evaluate((key) => localStorage.getItem(key), SAVE_KEY)
  await seedContext.close()
  if (!rawSave) throw new Error('Onboarding did not produce a save envelope to seed normal-mode boot')
  const saveData = decodeSave(rawSave)
  saveData.onboardingComplete = true
  saveData.tutorialDone = true
  const seededEnvelope = encodeSave(saveData)

  context = await browser.newContext({ serviceWorkers: 'block' })
  await context.addInitScript(({ key, envelope }) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(key, envelope)
  }, { key: SAVE_KEY, envelope: seededEnvelope })
} else {
  // --fresh mod — "hiç kaydı olmayan yeni kullanıcı gerçek onboarding akışını
  // tamamladıktan sonra HUD'a ulaşır." Tüm Baron save slotları temiz başlar;
  // baron_setup_done KULLANILMAZ.
  context = await browser.newContext({ serviceWorkers: 'block' })
  await context.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  // Yalnız --fresh modda gerekli: firmsPurchaseUnlocked() kariyer-aksiyon eşiğini
  // (bkz. aşağı) test süresinde makul tutmak için state'i expose eder.
  await instrumentContext(context)
}

const page = await context.newPage()
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await waitForBootSettled(page)

let checks = await readBootChecks(page)

if (!fresh) {
  if (checks.onboardingOpen) {
    errors.push('Onboarding overlay should not appear for a returning user with a valid, completed save')
  }
  if (!checks.hasHud) {
    errors.push('HUD did not appear for a returning user with a valid, completed save')
  }
} else {
  if (!checks.onboardingOpen) {
    errors.push('Onboarding overlay did not appear for a brand-new user with no save')
  } else {
    await completeOnboarding(page)
  }

  checks = await readBootChecks(page)
  if (!checks.hasHud) {
    errors.push('RefApp shell/navigation did not appear after completing onboarding')
  }

  // Güncel oyun: firma satın alma, para yeterli olsa bile kariyer ilerlemesi
  // gerektirir (GameState.firmsPurchaseUnlocked — iş seçilmiş VE ≥3 kariyer
  // aksiyonu VEYA ≥₺1.000 kariyer geliri). Gerçek kullanıcı akışı: iş seç
  // (kanıtlanmış Career sekmesi/iş kartı akışı), ardından aksiyon eşiğini
  // gerçek zamanlı çok-günlük simülasyon yerine minimum bir state-seed ile
  // geçer (a1/a2'de de kurulan doğrudan state-poke deseniyle aynı stilde).
  await goTab(page, /Career|Kariyer/i)
  await page.waitForSelector('.ref-career-job-card', { timeout: 15000 })
  const courier = page.locator('.ref-career-job-card').filter({ hasText: /Courier|Kurye/i }).first()
  const jobCard = (await courier.count()) ? courier : page.locator('.ref-career-job-card').first()
  await jobCard.click()
  await page.waitForFunction(() => !!window.__tur15State?.career?.jobId, null, { timeout: 5000 }).catch(() => {})
  await page.evaluate(() => {
    if (window.__tur15State) window.__tur15State.career.actionsTotal = 3
  })

  await goTab(page, /Firms|Firmalar/i)
  await page.waitForSelector('.ref-prod-card', { timeout: 15000 })
  const starterBuy = page.locator('.ref-prod-card[data-id="stajyer"] .ref-prod-btn.buyable')
  if (await starterBuy.count() !== 1) {
    errors.push('Starter business buy button missing or still locked after career unlock threshold')
  } else {
    await starterBuy.click({ timeout: 3000 })
    await page.waitForFunction(() => Number(window.__tur15State?.producers?.stajyer ?? 0) >= 1, null, { timeout: 3000 }).catch(() => {})
  }

  const ownedAfter = await page.evaluate(() => Number(window.__tur15State?.producers?.stajyer ?? 0))
  if (!(ownedAfter >= 1)) errors.push(`Starter business was not purchased: owned=${ownedAfter}`)

  checks = await readBootChecks(page)
}

console.log('URL:', url)
console.log('appEmpty:', checks.appEmpty)
console.log('bootError:', checks.bootError)
console.log('hasHud:', checks.hasHud)
console.log('title:', checks.title)
console.log('appPreview:', checks.appPreview)
console.log('errors:', errors)

const ok = !checks.appEmpty && !checks.bootError && checks.hasHud && errors.length === 0
await context.close()
await browser.close()
process.exit(ok ? 0 : 1)
