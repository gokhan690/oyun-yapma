import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const SAVE_KEY = 'is_imparatorlugu_save_v10'
const OBFUSCATION_KEY = 'PT2026x'
const VERSION = 10
const SCREENSHOT_DIR = path.resolve('test-results/tur15-b')

// TUR15-B'de türetilen değerler save şemasına ASLA sızmamalı (bkz. B4 kararı).
const FORBIDDEN_DERIVED_KEYS = [
  'companyEconomySnapshot',
  'companyEconomyRank',
  'firmSort',
  'tur15b_firm_sort',
  'projectedAssignedManagerDailySalary',
  'dynamicManagerSalary',
  'snapshot',
  'rankingLabel',
  'managerSalaryPreview',
]

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
  if (!raw) return null
  const envelope = JSON.parse(raw)
  const json = deobfuscate(envelope.payload)
  if (computeChecksum(json) !== envelope.checksum) throw new Error('bad checksum')
  return JSON.parse(json)
}
function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`
    throw new Error(`${message}${suffix}`)
  }
}

let browser

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
      throw new Error('TUR15-B route patch: state construction anchor not found')
    }
    if (body.includes('const freshState = new GameState();')) {
      body = body.replaceAll('const freshState = new GameState();', 'const freshState = new GameState();\nglobalThis.__tur15State = freshState;')
    } else if (body.includes('const freshState = new GameState()')) {
      body = body.replaceAll('const freshState = new GameState()', 'const freshState = new GameState();\nglobalThis.__tur15State = freshState')
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
}

async function newContext(save = null, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport })
  await instrumentContext(context)
  if (save) {
    const encoded = encodeSave(save)
    await context.addInitScript(({ key, encodedSave }) => {
      if (sessionStorage.getItem('__tur15b_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(key, encodedSave)
      sessionStorage.setItem('__tur15b_seeded', '1')
    }, { key: SAVE_KEY, encodedSave: encoded })
  } else {
    await context.addInitScript(() => {
      if (sessionStorage.getItem('__tur15b_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      sessionStorage.setItem('__tur15b_seeded', '1')
    })
  }
  return context
}

async function openPage(context) {
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  return page
}

async function waitForShell(page) {
  await page.waitForSelector('.ref-shell', { timeout: 20000 })
  await page.waitForFunction(() => !!window.__tur15State, null, { timeout: 15000 })
  await page.evaluate(() => {
    window.__tur15State?.stopTick?.()
    if (window.__tur15State) window.__tur15State.gamePaused = true
  })
}

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

async function rawSave(page) {
  return page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)
}
async function saved(page) {
  return decodeSave(await rawSave(page))
}

async function makeBaseSave() {
  const context = await newContext()
  const page = await openPage(context)
  await completeOnboarding(page)
  const base = await saved(page)
  await context.close()
  return base
}

function normalizeFixture(save) {
  const out = clone(save)
  out.money = 999_999_999_999
  out.totalEarned = Math.max(0, Number(out.totalEarned ?? 0))
  out.lastSaveTime = Date.now()
  out.pendingOfflineEarnings = 0
  out.offlineRewardSettlementAt = null
  out.offlineRewardPresentedSettlementAt = null
  out.comebackPending = 0
  out.comebackSettlementAt = null
  out.comebackPresentedSettlementAt = null
  out.gamePaused = true
  out.activeCrisis = null
  out.activeRivalEvents = []
  out.lifeEvents = []
  out.pendingDecisions = []
  out.pendingUndo = null
  out.producers = Object.fromEntries(Object.keys(out.producers || { stajyer: 0 }).map((key) => [key, 0]))
  out.producerUpgrades = {}
  out.producerLevels = {}
  out.producerModernized = {}
  out.firmManagerAssignments = {}
  out.namedManagers = []
  out.ipoCount = 1 // modernizeProducer testi için (yalnız IPO sonrası anlamlı)
  return out
}

async function launchWithSave(save, viewport) {
  const context = await newContext(save, viewport)
  const page = await openPage(context)
  await waitForShell(page)
  return { context, page }
}

async function saveShot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const file = path.join(SCREENSHOT_DIR, name)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

/**
 * Senaryo 1 — Yeni oyun → satın alma/manager/upgrade/level/modernize → save → reload.
 * Beklenen: tüm değerler reload sonrası birebir korunur.
 */
async function scenarioPersistenceRoundTrip(base) {
  const fixture = normalizeFixture(base)
  // Küçük owned/alım adedi bilinçli: costMultiplier üstel büyüdüğü için yüksek owned'da
  // maliyet trilyonları aşabiliyor. Bu senaryo satın alma MEKANİZMASINI kalıcılıkla
  // birlikte kanıtlamak içindir, B2-A/B2-B'nin fiyat eğrisini yeniden test etmek değil.
  const initialFabrika = 3
  const buyAmount = 2
  const expectedFabrika = initialFabrika + buyAmount
  fixture.producers.fabrika = initialFabrika // firmsPurchaseUnlocked() anyProducerOwned() ile açık olsun
  fixture.totalEarned = 10_000_000 // isProducerUnlocked() eşiği (fabrika.unlockAt=480_000) rahatça aşılsın
  fixture.money = 50_000_000_000_000 // 50 trilyon güvenlik payı
  const { context, page } = await launchWithSave(fixture)

  const actions = await page.evaluate((qty) => {
    const s = window.__tur15State
    const buy = s.buyProducer('fabrika', qty)
    const manager = s.assignFirmManager('fabrika', 'fatma')
    const upgrade = s.buyFirmUpgrade('fabrika', 'kalite')
    const level = s.levelUpFirm('fabrika')
    const modernize = s.modernizeProducer('fabrika')
    return { buy, manager, upgrade, level, modernize }
  }, buyAmount)
  assert(actions.buy === true, 'Senaryo 1: buyProducer başarısız olmamalı', actions)
  assert(actions.manager?.ok === true, 'Senaryo 1: assignFirmManager başarısız olmamalı', actions)
  assert(actions.upgrade === true, 'Senaryo 1: buyFirmUpgrade başarısız olmamalı', actions)
  assert(actions.level === true, 'Senaryo 1: levelUpFirm başarısız olmamalı', actions)
  assert(actions.modernize === true, 'Senaryo 1: modernizeProducer başarısız olmamalı', actions)

  const before = await page.evaluate(() => {
    const s = window.__tur15State
    return {
      money: s.money,
      ownedFabrika: s.producers.fabrika,
      manager: s.firmManagerAssignments.fabrika ?? null,
      upgrades: [...(s.producerUpgrades.fabrika ?? [])],
      level: s.producerLevels.fabrika ?? 1,
      modernized: !!s.producerModernized.fabrika,
    }
  })

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)

  const after = await page.evaluate(() => {
    const s = window.__tur15State
    return {
      money: s.money,
      ownedFabrika: s.producers.fabrika,
      manager: s.firmManagerAssignments.fabrika ?? null,
      upgrades: [...(s.producerUpgrades.fabrika ?? [])],
      level: s.producerLevels.fabrika ?? 1,
      modernized: !!s.producerModernized.fabrika,
    }
  })

  assert(after.money === before.money, 'Senaryo 1: money reload sonrası korunmalı', { before, after })
  assert(
    after.ownedFabrika === before.ownedFabrika && after.ownedFabrika === expectedFabrika,
    'Senaryo 1: owned adet reload sonrası korunmalı',
    { before, after, expectedFabrika },
  )
  assert(after.manager === before.manager && after.manager === 'fatma', 'Senaryo 1: manager ataması reload sonrası korunmalı', { before, after })
  assert(JSON.stringify(after.upgrades) === JSON.stringify(before.upgrades) && after.upgrades.includes('kalite'), 'Senaryo 1: upgrade reload sonrası korunmalı', { before, after })
  assert(after.level === before.level && after.level >= 2, 'Senaryo 1: level reload sonrası korunmalı', { before, after })
  assert(after.modernized === before.modernized && after.modernized === true, 'Senaryo 1: modernize reload sonrası korunmalı', { before, after })

  const shot = await saveShot(page, '01-persistence-round-trip.png')
  await context.close()
  return { before, after, screenshot: shot }
}

/**
 * Senaryo 2 — Eski/eksik alanlı save güvenli yüklenir; para/firma kaybı olmaz,
 * eksik alanlar (firmManagerAssignments/producerUpgrades/producerLevels/
 * producerModernized) GameState.loadFrom()'un belgelenen varsayılanlarına düşer.
 */
async function scenarioLegacySaveLoadsSafely(base) {
  const fixture = normalizeFixture(base)
  fixture.producers.fabrika = 12
  fixture.money = 42_000
  // Bu 4 alan B döneminde eklendi/genişledi — eski bir save'de hiç bulunmayabilir.
  delete fixture.firmManagerAssignments
  delete fixture.producerUpgrades
  delete fixture.producerLevels
  delete fixture.producerModernized

  const { context, page } = await launchWithSave(fixture)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  const loaded = await page.evaluate(() => {
    const s = window.__tur15State
    return {
      money: s.money,
      ownedFabrika: s.producers.fabrika,
      firmManagerAssignments: { ...s.firmManagerAssignments },
      producerUpgrades: { ...s.producerUpgrades },
      producerLevels: { ...s.producerLevels },
      producerModernized: { ...s.producerModernized },
      bootError: document.querySelector('#boot-error')?.textContent || '',
    }
  })

  assert(loaded.bootError === '', 'Senaryo 2: eksik alanlı save boot hatası vermemeli', loaded)
  assert(loaded.money === 42_000, 'Senaryo 2: para eksik-alanlı save yüklemesinde kaybolmamalı', loaded)
  assert(loaded.ownedFabrika === 12, 'Senaryo 2: firma adedi eksik-alanlı save yüklemesinde kaybolmamalı', loaded)
  assert(Object.keys(loaded.firmManagerAssignments).length === 0, 'Senaryo 2: firmManagerAssignments eksikse {} varsayılanına düşmeli', loaded)
  assert(Object.keys(loaded.producerUpgrades).length === 0, 'Senaryo 2: producerUpgrades eksikse {} varsayılanına düşmeli', loaded)
  assert(Object.keys(loaded.producerLevels).length === 0, 'Senaryo 2: producerLevels eksikse {} varsayılanına düşmeli', loaded)
  assert(Object.keys(loaded.producerModernized).length === 0, 'Senaryo 2: producerModernized eksikse {} varsayılanına düşmeli', loaded)
  assert(errors.length === 0, 'Senaryo 2: eksik-alanlı save yüklemesi console/page hatası üretmemeli', errors)

  await context.close()
  return { loaded }
}

/**
 * Senaryo 3 — TUR15-B'de türetilen alanlar save şemasına sızmamış (yasaklı anahtar taraması).
 * Ana kırıcı test budur; tam anahtar listesi yalnız BİLGİ amaçlı raporlanır.
 */
async function scenarioForbiddenDerivedKeysAbsent(base) {
  const fixture = normalizeFixture(base)
  fixture.producers.fabrika = 30
  const { context, page } = await launchWithSave(fixture)

  await page.evaluate(() => {
    const s = window.__tur15State
    s.assignFirmManager('fabrika', 'fatma')
    // Türetilmiş alanlara canlı erişim (save'e sızıp sızmadığını kanıtlamak için tetikleyici).
    void s.companyEconomySnapshot()
    void s.managerDailySalaryFor('fabrika')
    void s.projectedAssignedManagerDailySalary('fabrika', 1)
  })

  const result = await page.evaluate((forbidden) => {
    const s = window.__tur15State
    const json = s.toJSON()
    const keys = Object.keys(json)
    const forbiddenPresent = forbidden.filter((k) => keys.includes(k))
    return { keys, forbiddenPresent }
  }, FORBIDDEN_DERIVED_KEYS)

  assert(result.forbiddenPresent.length === 0, 'Senaryo 3: türetilmiş/yasaklı alanlar toJSON() içinde OLMAMALI', result.forbiddenPresent)

  await context.close()
  return { fullKeyListInfoOnly: result.keys, forbiddenChecked: FORBIDDEN_DERIVED_KEYS }
}

/**
 * Senaryo 4 — Sıralama tercihi localStorage'da kalıcı olabilir ama toJSON()'a hiç girmez;
 * reload sonrası da localStorage tercihi hayatta kalır (save state'inden bağımsız).
 */
async function scenarioSortPreferenceStaysOutOfSave(base) {
  const fixture = normalizeFixture(base)
  fixture.producers.fabrika = 5
  const { context, page } = await launchWithSave(fixture, { width: 430, height: 860 })

  await page.locator('.ref-bottom-nav .ref-nav-btn').filter({ hasText: /Firms|Firmalar/i }).first().click()
  await page.waitForSelector('.ref-prod-card', { timeout: 15000 })
  await page.locator('[data-sort="price_asc"]').click()
  await page.waitForTimeout(50)

  const prefAfterClick = await page.evaluate(() => localStorage.getItem('tur15b_firm_sort'))
  assert(prefAfterClick === 'price_asc', 'Senaryo 4: sıralama tercihi tıklama sonrası localStorage\'a yazılmalı', prefAfterClick)

  // Not: gevşek /sort/i regex'i "advisorTip" gibi alakasız alanlarda yanlış pozitif
  // üretir (a-d-v-i-SOR-Tip). Bunun yerine tam FORBIDDEN_DERIVED_KEYS listesi kontrol edilir.
  const jsonKeys = await page.evaluate(() => Object.keys(window.__tur15State.toJSON()))
  const forbiddenPresent = FORBIDDEN_DERIVED_KEYS.filter((k) => jsonKeys.includes(k))
  assert(forbiddenPresent.length === 0, 'Senaryo 4: sıralama tercihi/türetilmiş alanlar toJSON() içinde görünmemeli', { forbiddenPresent, jsonKeys })

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)
  const prefAfterReload = await page.evaluate(() => localStorage.getItem('tur15b_firm_sort'))
  assert(prefAfterReload === 'price_asc', 'Senaryo 4: sıralama tercihi reload sonrası localStorage\'da hayatta kalmalı (save\'den bağımsız)', prefAfterReload)

  await context.close()
  return { prefAfterClick, prefAfterReload }
}

/**
 * Senaryo 5 — B1-B3 ekonomi/snapshot/label sözleşmesi bozulmamış (hafif, kalıcı regresyon).
 * Formül tablosunun tam yeniden doğrulaması DEĞİL — B2-B'de zaten commit'lendi;
 * burada yalnız saflık + köprü kimliği + etiket-max-2 + PRODUCERS sağlığı kontrol edilir.
 */
async function scenarioEconomyContractHolds(base) {
  const fixture = normalizeFixture(base)
  fixture.producers.fabrika = 40
  const { context, page } = await launchWithSave(fixture)

  const result = await page.evaluate(() => {
    const s = window.__tur15State
    s.assignFirmManager('fabrika', 'fatma')

    // Saflık: snapshot iki kez çağrılır, producers/firmManagerAssignments değişmemeli.
    const beforeJson = JSON.stringify({ producers: s.producers, firmManagerAssignments: s.firmManagerAssignments })
    const snap1 = s.companyEconomySnapshot()
    const snap2 = s.companyEconomySnapshot()
    const afterJson = JSON.stringify({ producers: s.producers, firmManagerAssignments: s.firmManagerAssignments })

    // Köprü kimliği (plan §8): netDailyProfit + kişisel gelir satırları === settlement.total
    const settlement = s.dailySettlementBreakdown()
    const bridgeLeft = snap1.netDailyProfit + snap1.dynastyDailyIncome + snap1.characterDailyBonus + snap1.careerWageDaily
    const bridgeRight = settlement.total

    const maxTwoLabels = snap1.firmBreakdowns.every((b) => b.labels.length <= 2)
    const noNaN = snap1.firmBreakdowns.every((b) => Number.isFinite(b.grossIncome) && Number.isFinite(b.netProfit))

    const fabrikaBreakdown = snap1.firmBreakdowns.find((b) => b.producerId === 'fabrika')

    return {
      purityUnchanged: beforeJson === afterJson,
      snapshotsEqualNumerically: snap1.grossDailyIncome === snap2.grossDailyIncome && snap1.netDailyProfit === snap2.netDailyProfit,
      bridgeLeft,
      bridgeRight,
      bridgeMatches: Math.abs(bridgeLeft - bridgeRight) < 1e-6,
      maxTwoLabels,
      noNaN,
      producersCount: undefined, // set below via separate import
      fabrikaManagerSalaryPositive: (fabrikaBreakdown?.managerSalary ?? 0) > 0,
    }
  })

  const producersCount = await page.evaluate(async () => (await import('/src/game/Economy.ts')).PRODUCERS.length)

  assert(result.purityUnchanged, 'Senaryo 5: companyEconomySnapshot() producers/firmManagerAssignments\'ı değiştirmemeli', result)
  assert(result.snapshotsEqualNumerically, 'Senaryo 5: art arda iki snapshot aynı sayısal sonucu vermeli', result)
  assert(result.bridgeMatches, 'Senaryo 5: köprü kimliği (netDailyProfit+kişisel gelirler === settlement.total) bozulmamalı', result)
  assert(result.maxTwoLabels, 'Senaryo 5: hiçbir firma 2\'den fazla yatırım etiketi almamalı', result)
  assert(result.noNaN, 'Senaryo 5: grossIncome/netProfit hiçbir firmada NaN/Infinity olmamalı', result)
  assert(producersCount === 138, 'Senaryo 5: PRODUCERS tablosu hâlâ 138 firma içermeli', producersCount)
  assert(result.fabrikaManagerSalaryPositive, 'Senaryo 5: atanmış ekonomik menajerin maaşı pozitif olmalı (dinamik formül çalışıyor)', result)

  await context.close()
  return result
}

async function main() {
  browser = await chromium.launch()
  try {
    const base = await makeBaseSave()
    const results = {
      persistenceRoundTrip: await scenarioPersistenceRoundTrip(base),
      legacySaveLoadsSafely: await scenarioLegacySaveLoadsSafely(base),
      forbiddenDerivedKeysAbsent: await scenarioForbiddenDerivedKeysAbsent(base),
      sortPreferenceStaysOutOfSave: await scenarioSortPreferenceStaysOutOfSave(base),
      economyContractHolds: await scenarioEconomyContractHolds(base),
    }
    console.log('TUR15_B_RESULTS_START')
    console.log(JSON.stringify(results, null, 2))
    console.log('TUR15_B_RESULTS_END')
    console.log('TUR15-B4 persistence + regression suite passed')
  } finally {
    await browser?.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
