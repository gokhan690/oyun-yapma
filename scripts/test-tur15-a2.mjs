import { chromium } from 'playwright'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const SAVE_KEY = 'is_imparatorlugu_save_v10'
const OBFUSCATION_KEY = 'PT2026x'
const VERSION = 10
const START_MONEY = 1500
const PROFILE_LABELS = {
  sporcu: /Athlete|Sporcu/i,
}

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
      body = body.replace(
        'const state = new GameState();',
        'const state = new GameState();\nglobalThis.__tur15State = state;',
      )
    } else if (body.includes('const state = new GameState()')) {
      body = body.replace(
        'const state = new GameState()',
        'const state = new GameState();\nglobalThis.__tur15State = state',
      )
    } else {
      throw new Error('TUR15-A2 route patch: state construction anchor not found')
    }
    if (body.includes('const freshState = new GameState();')) {
      body = body.replaceAll(
        'const freshState = new GameState();',
        'const freshState = new GameState();\nglobalThis.__tur15State = freshState;',
      )
    } else if (body.includes('const freshState = new GameState()')) {
      body = body.replaceAll(
        'const freshState = new GameState()',
        'const freshState = new GameState();\nglobalThis.__tur15State = freshState',
      )
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
      if (sessionStorage.getItem('__tur15_a2_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(key, encodedSave)
      localStorage.setItem('baron_setup_done', '1')
      sessionStorage.setItem('__tur15_a2_seeded', '1')
    }, { key: SAVE_KEY, encodedSave: encoded })
  } else {
    await context.addInitScript(() => {
      if (sessionStorage.getItem('__tur15_a2_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      sessionStorage.setItem('__tur15_a2_seeded', '1')
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

async function waitForShell(page, requireState = true) {
  await page.waitForSelector('.ref-shell', { timeout: 20000 })
  if (requireState) await page.waitForFunction(() => !!window.__tur15State, null, { timeout: 15000 })
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
  await chooseVisible(page, PROFILE_LABELS.sporcu)
  await clickNext(page)
  await clickNext(page)
  await page.locator('.onboarding-start-btn').click()
  await page.waitForSelector('.ref-shell', { timeout: 20000 })
  await page.waitForTimeout(300)
}

async function saved(page) {
  const raw = await rawSave(page)
  return decodeSave(raw)
}

async function rawSave(page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)
  return raw
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
  out.career = {
    ...(out.career ?? {}),
    jobId: null,
    level: 1,
    xp: 0,
    stress: 0,
    lastWageDay: 7,
    dailyWagePaidToday: false,
    wageEarnedToday: 0,
    totalWageEarned: 0,
    actionsUsedToday: [],
    isEntrepreneur: false,
  }
  return out
}

async function launchWithSave(save, viewport) {
  const context = await newContext(save, viewport)
  const page = await openPage(context)
  await waitForShell(page)
  return { context, page }
}

async function reloadToCareer(page) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)
  await goCareer(page)
}

async function goCareer(page) {
  await page.locator('.ref-bottom-nav .ref-nav-btn').filter({ hasText: /Career|Kariyer/i }).first().click()
  await page.waitForSelector('.ref-career-job-card', { timeout: 15000 })
}

function jobCard(page, re) {
  return page.locator('.ref-career-job-card').filter({ hasText: re }).first()
}

async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__tur15State
    const salaryVals = Array.from(document.querySelectorAll('.ref-job-stat__val.income')).map((node) => node.textContent?.trim() ?? '')
    return {
      money: Number(s?.money ?? 0),
      career: s?.career ? {
        jobId: s.career.jobId,
        level: s.career.level,
        lastWageDay: s.career.lastWageDay,
        totalWageEarned: s.career.totalWageEarned,
        isEntrepreneur: s.career.isEntrepreneur,
      } : null,
      eligibility: typeof s?.careerJobEligibility === 'function'
        ? {
          courier: s.careerJobEligibility('kurye'),
          waiter: s.careerJobEligibility('garson'),
          sales: s.careerJobEligibility('satis_temsilcisi'),
          intern: s.careerJobEligibility('yazilim_stajyeri'),
        }
        : null,
      salaryVals,
      text: document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      rewardOverlays: document.querySelectorAll('.ref-reward-overlay').length,
      brokenImages: window.__tur15BrokenImages ?? [],
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      innerWidth: window.innerWidth,
    }
  })
}

async function scenarioUnemployedCanStartAndLeave(base) {
  const { context, page } = await launchWithSave(normalizeFixture(base))
  await goCareer(page)
  let shot = await snapshot(page)
  assert(await page.locator('.ref-career-job-card').count() >= 6, 'all career jobs should be visible')
  assert(shot.eligibility.courier.eligible && shot.eligibility.waiter.eligible && shot.eligibility.sales.eligible, 'starter jobs should be open', shot.eligibility)
  assert(!shot.eligibility.intern.eligible, 'software intern should be locked at career level 1', shot.eligibility.intern)
  assert(shot.text.includes('Career Level 2 required') || shot.text.includes('Kariyer Seviyesi 2 gerekli'), 'locked card should show required career level')
  assert(shot.text.includes('Your Career Level: 1') || shot.text.includes('Mevcut Kariyer Seviyen: 1'), 'locked card should show current career level')

  const beforeMoney = shot.money
  await jobCard(page, /Courier|Kurye/i).click()
  await page.waitForTimeout(250)
  shot = await snapshot(page)
  assert(shot.career.jobId === 'kurye', 'unemployed player should start courier job', shot.career)
  assert(shot.money === beforeMoney, 'starting a job must not add money', { beforeMoney, afterMoney: shot.money })
  assert(shot.text.includes('Current Job') || shot.text.includes('Mevcut İş'), 'current job badge should be visible')
  assert(await jobCard(page, /Courier|Kurye/i).isDisabled(), 'current job card should be disabled')

  const wasEntrepreneur = shot.career.isEntrepreneur
  await page.locator('[data-career-leave]').click()
  await page.waitForTimeout(250)
  shot = await snapshot(page)
  assert(shot.career.jobId === null, 'leave job should clear jobId', shot.career)
  assert(shot.career.isEntrepreneur === wasEntrepreneur, 'leave job must not toggle entrepreneurship', shot.career)
  assert(shot.salaryVals[0]?.includes('0'), 'salary should show zero after leaving job', shot.salaryVals)
  await context.close()
}

async function scenarioLockedAndLevelTwoJobs(base) {
  const lockedSave = normalizeFixture(base)
  const { context, page } = await launchWithSave(lockedSave)
  await goCareer(page)
  assert(await jobCard(page, /Software Intern|Yazılım Stajyeri/i).isDisabled(), 'locked job button should be disabled')
  await context.close()

  const levelTwo = normalizeFixture(base)
  levelTwo.career.level = 2
  const next = await launchWithSave(levelTwo)
  await goCareer(next.page)
  assert(!(await jobCard(next.page, /Software Intern|Yazılım Stajyeri/i).isDisabled()), 'level 2 job should unlock at career level 2')
  await jobCard(next.page, /Software Intern|Yazılım Stajyeri/i).click()
  await next.page.waitForTimeout(250)
  const shot = await snapshot(next.page)
  assert(shot.career.jobId === 'yazilim_stajyeri', 'level 2 player should start software intern job', shot.career)
  await next.context.close()
}

async function scenarioChangeJobNoMoneyNoWageReset(base) {
  const save = normalizeFixture(base)
  save.career.jobId = 'kurye'
  save.career.lastWageDay = 11
  const { context, page } = await launchWithSave(save)
  await goCareer(page)
  const before = await snapshot(page)
  await jobCard(page, /Waiter|Garson/i).click()
  await page.waitForTimeout(250)
  const after = await snapshot(page)
  assert(after.career.jobId === 'garson', 'employed player should change to another open job', after.career)
  assert(after.money === before.money, 'job change must not add balance', { before: before.money, after: after.money })
  assert(after.career.lastWageDay === before.career.lastWageDay, 'job change must not reset lastWageDay', { before: before.career, after: after.career })
  await context.close()
}

async function scenarioUiActionsPersistImmediately(base) {
  const { context, page } = await launchWithSave(normalizeFixture(base))
  await goCareer(page)

  await jobCard(page, /Courier|Kurye/i).click()
  await page.waitForTimeout(250)
  let shot = await snapshot(page)
  assert(shot.career.jobId === 'kurye', 'persist scenario: UI start job should update GameState', shot.career)
  let save = await saved(page)
  assert(save.career?.jobId === 'kurye', 'persist scenario: start job should write jobId immediately to save', save.career)

  await reloadToCareer(page)
  shot = await snapshot(page)
  assert(shot.career.jobId === 'kurye', 'persist scenario: started job should survive reload', shot.career)
  assert(shot.text.includes('Current Job') || shot.text.includes('Mevcut İş'), 'persist scenario: current job badge should survive reload')

  const beforeSameJobSave = await rawSave(page)
  await jobCard(page, /Courier|Kurye/i).evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
  await page.waitForTimeout(50)
  const afterSameJobSave = await rawSave(page)
  assert(afterSameJobSave === beforeSameJobSave, 'persist scenario: same-job failure should not write a new save')

  await jobCard(page, /Waiter|Garson/i).click()
  await page.waitForTimeout(250)
  shot = await snapshot(page)
  assert(shot.career.jobId === 'garson', 'persist scenario: UI change job should update GameState', shot.career)
  save = await saved(page)
  assert(save.career?.jobId === 'garson', 'persist scenario: change job should write new jobId immediately to save', save.career)

  await reloadToCareer(page)
  shot = await snapshot(page)
  assert(shot.career.jobId === 'garson', 'persist scenario: changed job should survive reload', shot.career)
  assert(shot.text.includes('Current Job') || shot.text.includes('Mevcut İş'), 'persist scenario: changed job current badge should survive reload')

  await page.locator('[data-career-leave]').click()
  await page.waitForTimeout(250)
  shot = await snapshot(page)
  assert(shot.career.jobId === null, 'persist scenario: UI leave should clear GameState jobId', shot.career)
  save = await saved(page)
  assert(save.career?.jobId === null, 'persist scenario: leave job should persist null jobId immediately', save.career)

  await reloadToCareer(page)
  shot = await snapshot(page)
  assert(shot.career.jobId === null, 'persist scenario: leave job should survive reload as unemployed', shot.career)
  assert(shot.salaryVals[0]?.includes('0'), 'persist scenario: salary should remain zero after leave reload', shot.salaryVals)

  await context.close()
}

async function scenarioLoadInvalidAndPassiveIncome(base) {
  const active = normalizeFixture(base)
  active.career.jobId = 'kurye'
  let run = await launchWithSave(active)
  await goCareer(run.page)
  let shot = await snapshot(run.page)
  assert(shot.career.jobId === 'kurye', 'active career job should survive save/load', shot.career)
  await run.context.close()

  const invalid = normalizeFixture(base)
  invalid.career.jobId = 'legacy_bad_job'
  run = await launchWithSave(invalid)
  await goCareer(run.page)
  shot = await snapshot(run.page)
  assert(shot.career.jobId === null, 'invalid legacy jobId should load as unemployed', shot.career)
  await run.context.close()

  const passive = normalizeFixture(base)
  const producerKey = Object.keys(passive.producers)[0]
  if (producerKey) passive.producers[producerKey] = 25
  run = await launchWithSave(passive)
  await goCareer(run.page)
  shot = await snapshot(run.page)
  assert(shot.career.jobId === null, 'passive income fixture should stay unemployed', shot.career)
  assert(shot.salaryVals[0]?.includes('0'), 'career salary should stay zero even with firm/passive income', shot.salaryVals)
  await run.context.close()
}

async function scenarioMobileAndBoot(base) {
  const run = await launchWithSave(normalizeFixture(base), { width: 430, height: 900 })
  await goCareer(run.page)
  const shot = await snapshot(run.page)
  assert(shot.scrollWidth <= shot.innerWidth + 1, 'career page should not horizontally overflow at 430px', {
    scrollWidth: shot.scrollWidth,
    innerWidth: shot.innerWidth,
  })
  assert(shot.rewardOverlays === 0, 'basic career boot should not open reward overlay', shot.rewardOverlays)
  assert(shot.brokenImages.length === 0, 'career boot should not produce broken images', shot.brokenImages)
  await run.context.close()
}

async function main() {
  browser = await chromium.launch()
  try {
    const base = await makeBaseSave()
    await scenarioUnemployedCanStartAndLeave(base)
    await scenarioLockedAndLevelTwoJobs(base)
    await scenarioChangeJobNoMoneyNoWageReset(base)
    await scenarioUiActionsPersistImmediately(base)
    await scenarioLoadInvalidAndPassiveIncome(base)
    await scenarioMobileAndBoot(base)
    console.log('TUR15-A2 career UI scenarios passed')
  } finally {
    await browser?.close()
  }
}

main().catch(async (err) => {
  console.error(err)
  await browser?.close().catch(() => {})
  process.exit(1)
})
