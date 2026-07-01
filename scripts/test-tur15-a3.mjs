import { chromium } from 'playwright'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const SAVE_KEY = 'is_imparatorlugu_save_v10'
const OBFUSCATION_KEY = 'PT2026x'
const VERSION = 10
const START_MONEY = 1500

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

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail == null ? '' : `\n${JSON.stringify(detail, null, 2)}`
    throw new Error(`${message}${suffix}`)
  }
}

const initInstrumentation = () => {
  window.__tur15BrokenImages = []
  document.addEventListener('error', (event) => {
    const target = event.target
    if (target instanceof HTMLImageElement) window.__tur15BrokenImages.push(target.currentSrc || target.src || target.alt || 'unknown image')
  }, true)
}

let browser

async function instrumentContext(context) {
  await context.addInitScript(initInstrumentation)
  await context.route('**/src/main.ts*', async (route) => {
    const response = await route.fetch()
    const text = await response.text()
    let body = text
    if (body.includes('const state = new GameState();')) {
      body = body.replace('const state = new GameState();', 'const state = new GameState();\nglobalThis.__tur15State = state;')
    } else if (body.includes('const state = new GameState()')) {
      body = body.replace('const state = new GameState()', 'const state = new GameState();\nglobalThis.__tur15State = state')
    } else {
      throw new Error('TUR15-A3 route patch: state construction anchor not found')
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
      if (sessionStorage.getItem('__tur15_a3_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(key, encodedSave)
      localStorage.setItem('baron_setup_done', '1')
      sessionStorage.setItem('__tur15_a3_seeded', '1')
    }, { key: SAVE_KEY, encodedSave: encoded })
  } else {
    await context.addInitScript(() => {
      if (sessionStorage.getItem('__tur15_a3_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      sessionStorage.setItem('__tur15_a3_seeded', '1')
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
  await page.waitForTimeout(100)
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
  await page.waitForTimeout(300)
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
  return normalizeFixture(base)
}

function normalizeFixture(save) {
  const out = clone(save)
  out.money = START_MONEY
  out.totalEarned = 0
  out.lastSaveTime = Date.now()
  out.pendingOfflineEarnings = 0
  out.offlineRewardSettlementAt = null
  out.offlineRewardPresentedSettlementAt = null
  out.comebackPending = 0
  out.comebackSettlementAt = null
  out.comebackPresentedSettlementAt = null
  out.dailyLastClaim = todayKey()
  out.dailyStreak = Math.max(1, Number(out.dailyStreak ?? 1))
  out.gamePaused = true
  out.activeCrisis = null
  out.activeRivalEvents = []
  out.lifeEvents = []
  out.pendingDecisions = []
  out.pendingUndo = null
  out.producers = Object.fromEntries(Object.keys(out.producers || { stajyer: 0 }).map((key) => [key, 0]))
  out.producers.stajyer = 100
  out.producerUpgrades = {}
  out.producerLevels = { ...(out.producerLevels ?? {}), stajyer: 1 }
  out.producerModernized = { ...(out.producerModernized ?? {}), stajyer: false }
  out.managers = { ...(out.managers ?? {}), stajyer: false }
  out.managerAutoBuy = { ...(out.managerAutoBuy ?? {}), stajyer: false }
  out.firmManagerAssignments = { ...(out.firmManagerAssignments ?? {}) }
  delete out.firmManagerAssignments.stajyer
  out.namedManagers = []
  return out
}

async function launchWithSave(save, viewport = { width: 1280, height: 900 }) {
  const context = await newContext(save, viewport)
  const page = await openPage(context)
  await waitForShell(page)
  return { context, page }
}

async function goFirms(page) {
  await page.locator('.ref-bottom-nav .ref-nav-btn').filter({ hasText: /Firms|Firmalar/i }).first().click()
  await page.waitForSelector('.ref-prod-card', { timeout: 15000 })
}

async function openFirmDetail(page, producerId) {
  await goFirms(page)
  await page.locator(`.ref-prod-card[data-id="${producerId}"] .ref-prod-card__head`).click()
  await page.waitForSelector('.ref-detail-upg.live', { timeout: 15000 })
}

async function openStajyerDetail(page) {
  await openFirmDetail(page, 'stajyer')
}

async function reloadToStajyerDetail(page) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)
  await openStajyerDetail(page)
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const s = window.__tur15State
    const economy = await import('/src/game/Economy.ts')
    const upgrades = await import('/src/game/FirmUpgrades.ts')
    const def = economy.PRODUCERS.find((p) => p.id === 'stajyer')
    const list = def ? upgrades.firmUpgradesForProducer(def) : []
    const status = s?.firmUpgradeStatus?.('stajyer', 'kalite')
    return {
      money: Number(s?.money ?? 0),
      owned: Number(s?.producers?.stajyer ?? 0),
      producerUpgrades: [...(s?.producerUpgrades?.stajyer ?? [])],
      otherProducerUpgrades: [...(s?.producerUpgrades?.robot ?? [])],
      upgradeIds: list.map((u) => u.id),
      upgradeNames: list.map((u) => u.name),
      status,
      income: def && s ? Math.round(s.producerIncome(def)) : 0,
      cardCount: document.querySelectorAll('.ref-detail-upg.live').length,
      staticImageCount: document.querySelectorAll('.ref-detail-upg__img').length,
      buyButtonDisabled: document.querySelector('[data-upgrade-buy="kalite"]')?.disabled ?? null,
      text: document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      levelButtonCount: document.querySelectorAll('[data-act="level"], .ref-detail-actions.live .ref-btn.develop').length,
      managerBlockCount: document.querySelectorAll('.ref-mgr-block').length,
      sellButtonCount: document.querySelectorAll('[data-act="sell"]').length,
      rewardOverlays: document.querySelectorAll('.ref-reward-overlay').length,
      brokenImages: window.__tur15BrokenImages ?? [],
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      innerWidth: window.innerWidth,
    }
  })
}

async function openManagerPanel(page) {
  await page.locator('[data-act="manager-panel"]').first().click()
  await page.waitForSelector('.ref-mgr-sheet .ref-mgr-card', { timeout: 15000 })
}

async function managerSnapshot(page, producerId = 'fabrika', managerId = 'fatma') {
  return page.evaluate(async ({ producerId, managerId }) => {
    const s = window.__tur15State
    const economy = await import('/src/game/Economy.ts')
    const named = await import('/src/game/NamedManagers.ts')
    const def = economy.PRODUCERS.find((p) => p.id === producerId)
    const status = s?.managerHireStatus?.(producerId, managerId)
    const expectedIds = def
      ? named.NAMED_MANAGERS
          .filter((m) => named.managerApplicability(m, producerId, !!def.illegal) !== null)
          .map((m) => m.id)
      : []
    const visibleIds = [...document.querySelectorAll('[data-mgr-assign]')].map((el) => el.dataset.mgrAssign)
    const settlement = s?.dailySettlementBreakdown?.()
    const upgradeStatus = s?.firmUpgradeStatus?.(producerId, 'kalite')
    return {
      money: Number(s?.money ?? 0),
      owned: Number(s?.producers?.[producerId] ?? 0),
      assignedManager: s?.firmManagerAssignments?.[producerId] ?? null,
      otherAssignedManager: s?.firmManagerAssignments?.stajyer ?? null,
      namedManagers: [...(s?.namedManagers ?? [])],
      status,
      income: def && s ? Math.round(s.producerIncome(def)) : 0,
      managerSalary: Number(settlement?.managerSalary ?? 0),
      upgradeStatus,
      expectedIds,
      visibleIds,
      managerCardCount: document.querySelectorAll('.ref-mgr-card').length,
      fatmaButtonDisabled: document.querySelector('[data-mgr-assign="fatma"]')?.disabled ?? null,
      text: document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      levelButtonCount: document.querySelectorAll('[data-act="level"], .ref-detail-actions.live .ref-btn.develop').length,
      sellButtonCount: document.querySelectorAll('[data-act="sell"]').length,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      innerWidth: window.innerWidth,
    }
  }, { producerId, managerId })
}

async function scenarioOwnedUpgradePurchasePersists(base) {
  const save = normalizeFixture(base)
  save.money = 100_000
  const { context, page } = await launchWithSave(save, { width: 430, height: 860 })
  await openStajyerDetail(page)
  let shot = await snapshot(page)
  assert(shot.cardCount === shot.upgradeIds.length && shot.cardCount > 0, 'owned firm should render real domain upgrade list', shot)
  assert(shot.staticImageCount === 0, 'static image upgrade tiles should not remain', shot)
  assert(shot.text.includes(shot.upgradeNames[0]), 'upgrade card should use domain upgrade name', shot)
  assert(shot.status.dailyIncomeDelta > 0 && shot.status.paybackDays != null, 'upgrade preview should expose income delta and payback from domain status', shot.status)
  assert(await page.locator('.ref-detail-upg.live').first().locator('.ref-detail-upg__metrics > div').count() === 4, 'upgrade card should render current/after/delta/payback metrics')
  assert(shot.levelButtonCount > 0 && shot.managerBlockCount > 0 && shot.sellButtonCount > 0, 'level, manager and sell sections should remain visible', shot)
  assert(shot.scrollWidth <= shot.innerWidth + 1, '430px detail view must not horizontally overflow', { scrollWidth: shot.scrollWidth, innerWidth: shot.innerWidth })

  const before = shot
  const cost = before.status.cost
  const expectedIncome = before.status.incomeAfter
  await page.locator('[data-upgrade-buy="kalite"]').click()
  await page.waitForTimeout(250)
  shot = await snapshot(page)
  assert(shot.money === before.money - cost, 'upgrade purchase should debit exact cost once', { before: before.money, after: shot.money, cost })
  assert(shot.producerUpgrades.filter((id) => id === 'kalite').length === 1, 'producerUpgrades should contain upgrade once', shot.producerUpgrades)
  assert(shot.income === expectedIncome, 'actual income after purchase should match preview incomeAfter', { expectedIncome, actual: shot.income })
  assert(shot.status.purchased && !shot.status.canBuy && shot.buyButtonDisabled === true, 'purchased upgrade should become disabled', shot.status)
  assert(shot.otherProducerUpgrades.length === 0, 'another firm upgrade state must not be affected', shot.otherProducerUpgrades)

  const persisted = await saved(page)
  assert((persisted.producerUpgrades?.stajyer ?? []).includes('kalite'), 'successful upgrade should persist immediately', persisted.producerUpgrades)
  assert(persisted.money === shot.money, 'persisted money should match post-purchase money', { saved: persisted.money, live: shot.money })

  await reloadToStajyerDetail(page)
  const afterReload = await snapshot(page)
  assert(afterReload.producerUpgrades.filter((id) => id === 'kalite').length === 1, 'purchased upgrade should survive reload', afterReload.producerUpgrades)
  assert(afterReload.money === shot.money, 'reload should not debit upgrade cost again', { beforeReload: shot.money, afterReload: afterReload.money })
  assert(afterReload.income === shot.income, 'reload should preserve upgrade income bonus', { beforeReload: shot.income, afterReload: afterReload.income })
  assert(afterReload.status.purchased && afterReload.buyButtonDisabled === true, 'reload should show purchased state', afterReload.status)
  await context.close()
}

async function scenarioInsufficientAndLegacySave(base) {
  const poor = normalizeFixture(base)
  poor.money = 1
  const poorRun = await launchWithSave(poor, { width: 430, height: 860 })
  await openStajyerDetail(poorRun.page)
  let shot = await snapshot(poorRun.page)
  assert(shot.status.code === 'insufficient_money' && shot.buyButtonDisabled === true, 'insufficient money should disable upgrade purchase', shot.status)
  assert(shot.text.includes('Not enough balance') || shot.text.includes('Yetersiz bakiye'), 'insufficient state should show user text', shot.text)
  await poorRun.context.close()

  const oldSave = normalizeFixture(base)
  delete oldSave.producerUpgrades
  const legacyRun = await launchWithSave(oldSave, { width: 430, height: 860 })
  await openStajyerDetail(legacyRun.page)
  shot = await snapshot(legacyRun.page)
  assert(Array.isArray(shot.producerUpgrades) && shot.producerUpgrades.length === 0, 'legacy save without producerUpgrades should default safely', shot.producerUpgrades)
  assert(shot.cardCount === shot.upgradeIds.length && shot.cardCount > 0, 'legacy save should still render upgrade cards', shot)
  await legacyRun.context.close()

  const unowned = normalizeFixture(base)
  unowned.producers.stajyer = 0
  const unownedRun = await launchWithSave(unowned)
  const status = await unownedRun.page.evaluate(() => window.__tur15State.firmUpgradeStatus('stajyer', 'kalite'))
  assert(status.code === 'not_owned' && status.canBuy === false, 'unowned firm status should block upgrade purchase', status)
  await unownedRun.context.close()
}

async function scenarioManagerHirePersistsAndAffectsEconomy(base) {
  const save = normalizeFixture(base)
  save.money = 500_000
  save.totalEarned = 1_000_000
  save.producers.fabrika = 100
  save.producerUpgrades.fabrika = ['kalite']
  save.producerLevels.fabrika = 1
  save.producerModernized.fabrika = false
  save.firmManagerAssignments = {}
  save.namedManagers = []

  const { context, page } = await launchWithSave(save, { width: 430, height: 860 })
  await openFirmDetail(page, 'fabrika')
  await openManagerPanel(page)
  let shot = await managerSnapshot(page)
  assert(shot.managerCardCount === shot.expectedIds.length && shot.expectedIds.includes('fatma'), 'manager panel should render real domain manager list', shot)
  assert(shot.visibleIds.includes('fatma') && !shot.visibleIds.includes('zara'), 'manager panel should filter by domain applicability', shot)
  assert(shot.status.canHire && shot.status.code === 'ok', 'eligible owned firm should allow manager hire', shot.status)
  assert(shot.status.grossDailyDelta > 0, 'manager status should expose gross firm income contribution', shot.status)
  assert(shot.status.netDailyDelta === shot.status.grossDailyDelta - shot.status.salaryPerDay, 'net contribution should subtract daily salary', shot.status)
  assert(shot.status.paybackDays === Math.ceil(shot.status.hireCost / shot.status.netDailyDelta), 'payback should be derived from hire cost and net daily delta', shot.status)
  assert(shot.scrollWidth <= shot.innerWidth + 1, '430px manager panel must not horizontally overflow', { scrollWidth: shot.scrollWidth, innerWidth: shot.innerWidth })
  assert(shot.levelButtonCount > 0 && shot.sellButtonCount > 0, 'level and sell sections should remain visible with manager panel changes', shot)

  const before = shot
  await page.locator('[data-mgr-assign="fatma"]').click()
  await page.waitForTimeout(250)
  shot = await managerSnapshot(page)
  assert(shot.money === before.money - before.status.hireCost, 'manager hire should debit one-time cost exactly once', { before: before.money, after: shot.money, cost: before.status.hireCost })
  assert(shot.namedManagers.filter((m) => m.id === 'fatma').length === 1, 'namedManagers should contain hired manager once', shot.namedManagers)
  assert(shot.assignedManager === 'fatma', 'firm should store assigned manager id', shot)
  assert(shot.income === before.status.incomeAfter, 'actual income after manager hire should match preview incomeAfter', { expected: before.status.incomeAfter, actual: shot.income })
  assert(shot.managerSalary === before.status.salaryPerDay, 'daily settlement should include assigned manager salary', shot)
  assert(shot.status.hired && shot.status.code === 'already_here' && shot.fatmaButtonDisabled === null, 'assigned manager should be in current firm after panel closes', shot.status)
  assert(shot.upgradeStatus.incomeBefore === shot.income, 'upgrade preview should include active manager income without double counting', shot.upgradeStatus)
  assert(shot.otherAssignedManager == null, 'another firm manager state must not be affected', shot.otherAssignedManager)

  const persisted = await saved(page)
  assert(persisted.firmManagerAssignments?.fabrika === 'fatma', 'manager assignment should persist immediately', persisted.firmManagerAssignments)
  assert((persisted.namedManagers ?? []).filter((m) => m.id === 'fatma').length === 1, 'persisted namedManagers should contain manager once', persisted.namedManagers)
  assert(persisted.money === shot.money, 'persisted money should match post-hire money', { saved: persisted.money, live: shot.money })

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)
  await openFirmDetail(page, 'fabrika')
  const afterReload = await managerSnapshot(page)
  assert(afterReload.assignedManager === 'fatma', 'manager assignment should survive reload', afterReload)
  assert(afterReload.money === shot.money, 'reload should not debit manager hire cost again', { beforeReload: shot.money, afterReload: afterReload.money })
  assert(afterReload.income === shot.income, 'reload should preserve manager income effect', { beforeReload: shot.income, afterReload: afterReload.income })
  assert(afterReload.managerSalary === shot.managerSalary, 'reload should preserve manager salary effect', afterReload)
  await openManagerPanel(page)
  const panelAfterReload = await managerSnapshot(page)
  assert(panelAfterReload.fatmaButtonDisabled === true && panelAfterReload.status.code === 'already_here', 'assigned manager cannot be hired twice after reload', panelAfterReload.status)
  await context.close()

  const poor = normalizeFixture(base)
  poor.money = 1
  poor.producers.fabrika = 100
  const poorRun = await launchWithSave(poor, { width: 430, height: 860 })
  await openFirmDetail(poorRun.page, 'fabrika')
  await openManagerPanel(poorRun.page)
  const poorShot = await managerSnapshot(poorRun.page)
  assert(poorShot.status.code === 'insufficient_money' && poorShot.fatmaButtonDisabled === true, 'insufficient money should disable manager hire', poorShot.status)
  await poorRun.context.close()

  const oldSave = normalizeFixture(base)
  oldSave.producers.fabrika = 100
  delete oldSave.namedManagers
  delete oldSave.firmManagerAssignments
  const legacyRun = await launchWithSave(oldSave)
  await openFirmDetail(legacyRun.page, 'fabrika')
  const legacyShot = await managerSnapshot(legacyRun.page)
  assert(legacyShot.assignedManager == null && legacyShot.status.hired === false, 'legacy save without manager fields should default safely', legacyShot.status)
  await legacyRun.context.close()

  const unowned = normalizeFixture(base)
  unowned.producers.fabrika = 0
  const unownedRun = await launchWithSave(unowned)
  const unownedStatus = await unownedRun.page.evaluate(() => window.__tur15State.managerHireStatus('fabrika', 'fatma'))
  assert(unownedStatus.code === 'not_owned' && unownedStatus.canHire === false, 'unowned firm status should block manager hire', unownedStatus)
  await unownedRun.context.close()
}

async function main() {
  browser = await chromium.launch()
  try {
    const base = await makeBaseSave()
    await scenarioOwnedUpgradePurchasePersists(base)
    await scenarioInsufficientAndLegacySave(base)
    await scenarioManagerHirePersistsAndAffectsEconomy(base)
    console.log('TUR15-A3 firm upgrade and manager scenarios passed')
  } finally {
    await browser?.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
