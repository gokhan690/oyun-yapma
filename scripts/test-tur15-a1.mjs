import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const SAVE_KEY = 'is_imparatorlugu_save_v10'
const OBFUSCATION_KEY = 'PT2026x'
const VERSION = 10
const OFFLINE_AMOUNT = 76500
const START_MONEY = 1500
const FIXED_SETTLEMENT_AT = 1_766_000_000_000
const PROFILE_BONUSES = {
  calisan: 50,
  serbest: 120,
  girisimci: 0,
  sanatci: 200,
  akademisyen: 80,
  sporcu: 300,
}
const PROFILE_LABELS = {
  calisan: /Employee|Çalışan|Calisan/i,
  serbest: /Freelancer|Serbest/i,
  girisimci: /Entrepreneur|Girişimci|Girisimci/i,
  sanatci: /Artist|Sanatçı|Sanatci/i,
  akademisyen: /Academic|Akademisyen/i,
  sporcu: /Athlete|Sporcu/i,
}
const screenshotDir = path.join(os.tmpdir(), 'oyun-yapma-tur15-a1')
fs.mkdirSync(screenshotDir, { recursive: true })

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

function todayKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail == null ? '' : `\n${JSON.stringify(detail, null, 2)}`
    throw new Error(`${message}${suffix}`)
  }
}

const initInstrumentation = () => {
  window.__tur15Trace = []
  window.__tur15BrokenImages = []
  window.__tur15FailedRequests = []
  window.__tur15Log = (type, detail = {}) => window.__tur15Trace.push({ t: Math.round(performance.now()), type, detail })
  window.__tur15InstallStateTrace = (state) => {
    if (!state || state.__tur15Traced) return
    Object.defineProperty(state, '__tur15Traced', { value: true })
    const wrap = (name) => {
      const original = state[name]
      if (typeof original !== 'function') return
      state[name] = function(...args) {
        const before = {
          money: Number(this.money),
          pendingOfflineEarnings: Number(this.pendingOfflineEarnings ?? 0),
          offlineRewardSettlementAt: this.offlineRewardSettlementAt ?? null,
          offlineRewardPresentedSettlementAt: this.offlineRewardPresentedSettlementAt ?? null,
          comebackPending: Number(this.comebackPending ?? 0),
          jobId: this.career?.jobId ?? null,
        }
        const result = original.apply(this, args)
        const after = {
          money: Number(this.money),
          pendingOfflineEarnings: Number(this.pendingOfflineEarnings ?? 0),
          offlineRewardSettlementAt: this.offlineRewardSettlementAt ?? null,
          offlineRewardPresentedSettlementAt: this.offlineRewardPresentedSettlementAt ?? null,
          comebackPending: Number(this.comebackPending ?? 0),
          jobId: this.career?.jobId ?? null,
        }
        window.__tur15Log('state_method', { name, args: JSON.parse(JSON.stringify(args)), before, after, result })
        return result
      }
    }
    for (const name of [
      'applyOfflineEarnings',
      'markOfflineRewardPresented',
      'claimOfflineReward',
      'claimOfflineViaAd',
      'claimComebackViaAd',
      'creditMoney',
      'addMoney',
      'addMoneyRaw',
      'setCareerJob',
      'startTick',
      'stopTick',
      'dailySettlementBreakdown',
      'incomePerSecond',
      'incomePerDay',
      'passiveIncomePerSecond',
    ]) wrap(name)
    const originalEmit = state.emit
    if (typeof originalEmit === 'function') {
      state.emit = function(event) {
        window.__tur15Log('game_event', {
          event: JSON.parse(JSON.stringify(event ?? null)),
          money: Number(this.money),
          gameTimeMs: Number(this.gameTimeMs),
        })
        return originalEmit.call(this, event)
      }
    }
  }
  document.addEventListener('error', (event) => {
    const target = event.target
    if (target instanceof HTMLImageElement) window.__tur15BrokenImages.push(target.currentSrc || target.src || target.alt || 'unknown image')
  }, true)
}

let browser
let routeHits = { main: 0 }

async function instrumentContext(context) {
  await context.addInitScript(initInstrumentation)
  await context.route('**/src/main.ts*', async (route) => {
    routeHits.main++
    const response = await route.fetch()
    const text = await response.text()
    let body = text
    if (body.includes('const state = new GameState();')) {
      body = body.replace(
        'const state = new GameState();',
        'const state = new GameState();\nglobalThis.__tur15State = state;\nglobalThis.__tur15InstallStateTrace?.(state);',
      )
    } else if (body.includes('const state = new GameState()')) {
      body = body.replace(
        'const state = new GameState()',
        'const state = new GameState();\nglobalThis.__tur15State = state;\nglobalThis.__tur15InstallStateTrace?.(state)',
      )
    } else {
      throw new Error('TUR15 route patch: state construction anchor not found')
    }
    if (body.includes('const freshState = new GameState();')) {
      body = body.replaceAll(
        'const freshState = new GameState();',
        'const freshState = new GameState();\nglobalThis.__tur15State = freshState;\nglobalThis.__tur15InstallStateTrace?.(freshState);',
      )
    } else if (body.includes('const freshState = new GameState()')) {
      body = body.replaceAll(
        'const freshState = new GameState()',
        'const freshState = new GameState();\nglobalThis.__tur15State = freshState;\nglobalThis.__tur15InstallStateTrace?.(freshState)',
      )
    }
    if (body.includes('const ads = new AdManager();')) {
      body = body.replace(
        'const ads = new AdManager();',
        'const ads = new AdManager();\nads.showRewarded = async (type) => globalThis.__tur15AdFail ? ({ success: false, type, reason: "Test ad cancelled" }) : ({ success: true, type });',
      )
    } else if (body.includes('const ads = new AdManager()')) {
      body = body.replace(
        'const ads = new AdManager()',
        'const ads = new AdManager();\nads.showRewarded = async (type) => globalThis.__tur15AdFail ? ({ success: false, type, reason: "Test ad cancelled" }) : ({ success: true, type })',
      )
    } else {
      throw new Error('TUR15 route patch: ad manager anchor not found')
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
}

async function newContext(save = null) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } })
  context.on('requestfailed', (request) => {
    const failure = request.failure()
    if (request.resourceType() === 'image') {
      context.pages()[0]?.evaluate(([failedUrl, errorText]) => {
        window.__tur15FailedRequests?.push({ url: failedUrl, errorText })
      }, [request.url(), failure?.errorText ?? 'unknown']).catch(() => {})
    }
  })
  await instrumentContext(context)
  if (save) {
    const encoded = encodeSave(save)
    await context.addInitScript(({ key, encodedSave }) => {
      if (sessionStorage.getItem('__tur15_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(key, encodedSave)
      localStorage.setItem('baron_setup_done', '1')
      sessionStorage.setItem('__tur15_seeded', '1')
    }, { key: SAVE_KEY, encodedSave: encoded })
  } else {
    await context.addInitScript(() => {
      if (sessionStorage.getItem('__tur15_seeded')) return
      localStorage.clear()
      sessionStorage.clear()
      sessionStorage.setItem('__tur15_seeded', '1')
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
}

async function clickNext(page) {
  await page.locator('.onboarding-next-btn').first().click()
  await page.waitForTimeout(100)
}

async function chooseVisible(page, re) {
  const btn = page.locator('.onboarding-country-btn').filter({ hasText: re }).first()
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

async function completeOnboarding(page, profileJob = 'sporcu') {
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
  await chooseVisible(page, PROFILE_LABELS[profileJob] ?? PROFILE_LABELS.sporcu)
  await clickNext(page)
  await clickNext(page)
  await page.locator('.onboarding-start-btn').click()
  await waitForShell(page, false)
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
  out.totalEarned = Math.max(0, Number(out.totalEarned ?? 0))
  out.lastSaveTime = Date.now()
  out.pendingOfflineEarnings = 0
  out.offlineRewardSettlementAt = null
  out.offlineRewardPresentedSettlementAt = null
  out.comebackPending = 0
  out.comebackSettlementAt = null
  out.comebackPresentedSettlementAt = null
  out.dailyLastClaim = todayKey()
  out.dailyStreak = Math.max(1, Number(out.dailyStreak ?? 1))
  out.gamePaused = false
  out.activeCrisis = null
  out.activeRivalEvents = []
  out.lifeEvents = []
  out.pendingDecisions = []
  out.pendingUndo = null
  out.producers = Object.fromEntries(Object.keys(out.producers || { stajyer: 0 }).map((key) => [key, 0]))
  out.career = {
    ...(out.career ?? {}),
    jobId: null,
    lastWageDay: 0,
    dailyWagePaidToday: false,
    totalWageEarned: 0,
    actionsUsedToday: [],
  }
  return out
}

function offlineFixture(base, overrides = {}) {
  return {
    ...normalizeFixture(base),
    pendingOfflineEarnings: OFFLINE_AMOUNT,
    offlineRewardSettlementAt: FIXED_SETTLEMENT_AT,
    offlineRewardPresentedSettlementAt: 0,
    ...overrides,
  }
}

async function stateSnapshot(page) {
  return page.evaluate(() => {
    const s = window.__tur15State
    return {
      money: s?.money ?? null,
      pendingOfflineEarnings: s?.pendingOfflineEarnings ?? null,
      offlineRewardSettlementAt: s?.offlineRewardSettlementAt ?? null,
      offlineRewardPresentedSettlementAt: s?.offlineRewardPresentedSettlementAt ?? null,
      shouldPresentOfflineReward: typeof s?.shouldPresentOfflineReward === 'function' ? s.shouldPresentOfflineReward() : null,
      hasPendingOfflineReward: typeof s?.hasPendingOfflineReward === 'function' ? s.hasPendingOfflineReward() : null,
      comebackPending: s?.comebackPending ?? null,
      shouldPresentComeback: typeof s?.shouldPresentComeback === 'function' ? s.shouldPresentComeback() : null,
      career: s?.career ? {
        jobId: s.career.jobId,
        lastWageDay: s.career.lastWageDay,
        dailyWagePaidToday: s.career.dailyWagePaidToday,
        totalWageEarned: s.career.totalWageEarned,
      } : null,
      rewardModals: Array.from(document.querySelectorAll('.ref-reward-overlay')).map((overlay) => ({
        title: overlay.querySelector('.ref-reward-title')?.textContent?.trim() ?? '',
        amount: overlay.querySelector('.ref-reward-amount')?.textContent?.trim() ?? '',
        primary: overlay.querySelector('.ref-reward-primary')?.textContent?.trim() ?? '',
        discard: overlay.querySelector('.ref-reward-discard')?.textContent?.trim() ?? '',
        rewardId: overlay.querySelector('.ref-reward-primary')?.getAttribute('data-reward-id') ?? null,
        settlementAt: overlay.querySelector('.ref-reward-primary')?.getAttribute('data-settlement-at') ?? null,
      })),
      banners: Array.from(document.querySelectorAll('.ref-rival-offer-banner')).map((banner) => ({
        text: banner.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        action: banner.querySelector('button')?.getAttribute('data-action') ?? null,
        settlementAt: banner.querySelector('button')?.getAttribute('data-settlement-at') ?? null,
      })),
      decisionOverlays: document.querySelectorAll('.ref-decision-overlay').length,
      brokenImages: window.__tur15BrokenImages ?? [],
      failedImageRequests: window.__tur15FailedRequests ?? [],
    }
  })
}

async function trace(page) {
  return page.evaluate(() => window.__tur15Trace ?? [])
}

async function screenshot(page, name) {
  const file = path.join(screenshotDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function launchWithSave(save) {
  const context = await newContext(save)
  const page = await openPage(context)
  await waitForShell(page)
  await page.waitForTimeout(500)
  return { context, page }
}

async function closeRewardModal(page) {
  const close = page.locator('.ref-reward-close').first()
  if (await close.isVisible().catch(() => false)) {
    await close.click()
    await page.waitForTimeout(250)
  }
}

async function claimOfflineModal(page) {
  const primary = page.locator('.ref-reward-primary[data-reward-id="offline"]').first()
  await primary.waitFor({ state: 'visible', timeout: 10000 })
  await primary.click()
  await page.waitForTimeout(500)
}

async function goCareer(page) {
  await page.locator('.ref-bottom-nav .ref-nav-btn').filter({ hasText: /Career|Kariyer/i }).first().click()
  await page.waitForSelector('.ref-career-job-card', { timeout: 15000 })
}

async function clickCourierJob(page) {
  const courier = page.locator('.ref-career-job-card').filter({ hasText: /Courier|Kurye/i }).first()
  const card = await courier.count() ? courier : page.locator('.ref-career-job-card').first()
  await card.click()
  await page.waitForTimeout(500)
}

function moneyMethodCalls(events) {
  return events.filter((entry) =>
    entry.type === 'state_method'
    && ['creditMoney', 'addMoney', 'addMoneyRaw', 'claimOfflineReward', 'claimOfflineViaAd', 'claimComebackViaAd', 'setCareerJob', 'dailySettlementBreakdown'].includes(entry.detail?.name),
  )
}

function achievementStaticAssertions() {
  const text = fs.readFileSync('src/game/Achievements.ts', 'utf8')
  const ids = [...text.matchAll(/id: '([^']+)'/g)].map((match) => match[1])
  const unique = new Set(ids)
  assert(ids.length > 0, 'Achievement audit: no achievement IDs found')
  assert(unique.size === ids.length, 'Achievement audit: achievement IDs must be unique', {
    duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
  })
  assert(!text.includes('c.unlockedThemes.length >= 3'), 'Achievement audit: theme_3 must not count built-in theme length directly')
  assert(text.includes('unlockedSeasonThemeCount(c.unlockedThemes) >= 3'), 'Achievement audit: theme_3 must use season-theme helper')
  return { totalIds: ids.length, uniqueIds: unique.size, theme3Check: 'season themes only' }
}

function expectedFreshDay2Delta(profileJob) {
  const profileBonus = PROFILE_BONUSES[profileJob] ?? 0
  const first100 = profileBonus >= 100 ? 50 : 0
  return profileBonus + first100
}

async function blockPointerInput(page) {
  await page.evaluate(() => {
    if (document.getElementById('tur15-input-blocker')) return
    const blocker = document.createElement('div')
    blocker.id = 'tur15-input-blocker'
    Object.assign(blocker.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'transparent',
      pointerEvents: 'auto',
    })
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      blocker.addEventListener(type, (event) => {
        event.preventDefault()
        event.stopPropagation()
      }, true)
    }
    document.body.appendChild(blocker)
  })
}

async function freshSnapshot(page, label) {
  return page.evaluate((snapshotLabel) => {
    const s = window.__tur15State
    const gameTimeMs = Number(s?.gameTimeMs ?? 0)
    const day = Math.floor(gameTimeMs / 12000) + 1
    return {
      label: snapshotLabel,
      performanceNow: Math.round(performance.now()),
      gameTimeMs,
      gameDay: day,
      cash: Number(s?.money ?? 0),
      totalEarned: Number(s?.totalEarned ?? 0),
      sessionEarned: Number(s?.sessionEarned ?? 0),
      characterIncomeDailyBonus: Number(s?.characterIncomeDailyBonus ?? 0),
      incomePerSecond: typeof s?.incomePerSecond === 'function' ? s.incomePerSecond() : null,
      incomePerDay: typeof s?.incomePerDay === 'function' ? s.incomePerDay() : null,
      passiveIncomePerSecond: typeof s?.passiveIncomePerSecond === 'function' ? s.passiveIncomePerSecond() : null,
      achievements: Array.from(s?.achievements ?? []),
      unlockedThemes: Array.from(s?.unlockedThemes ?? []),
      career: s?.career ? {
        jobId: s.career.jobId,
        dailyWagePaidToday: s.career.dailyWagePaidToday,
        lastWageDay: s.career.lastWageDay,
        totalWageEarned: s.career.totalWageEarned,
      } : null,
      producers: { ...(s?.producers ?? {}) },
      producerCountTotal: Object.values(s?.producers ?? {}).reduce((sum, count) => sum + Number(count || 0), 0),
      fameDailyIncome: s?.fameState?.isActive ? s.fameState.fameLevel * 0 : 0,
      pendingOfflineEarnings: Number(s?.pendingOfflineEarnings ?? 0),
      comebackPending: Number(s?.comebackPending ?? 0),
      ledgerTail: Array.isArray(s?.moneyTransactions) ? s.moneyTransactions.slice(-8) : [],
      rewardModals: document.querySelectorAll('.ref-reward-overlay').length,
      decisionOverlays: document.querySelectorAll('.ref-decision-overlay').length,
      brokenImages: window.__tur15BrokenImages ?? [],
      failedImageRequests: window.__tur15FailedRequests ?? [],
    }
  }, label)
}

async function waitForGameTime(page, targetMs, label) {
  await page.waitForFunction((ms) => {
    const s = window.__tur15State
    return !!s && Number(s.gameTimeMs) >= ms
  }, targetMs, { timeout: Math.max(20000, targetMs + 12000) })
  return freshSnapshot(page, label)
}

async function firstMoneyChange(page, startMoney, timeoutMs = 16000) {
  const started = Date.now()
  let last = await freshSnapshot(page, 'first-change-start')
  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(50)
    const next = await freshSnapshot(page, 'first-change-poll')
    if (next.cash !== startMoney) return { before: last, after: next }
    last = next
  }
  return null
}

async function launchFreshProfile(profileJob) {
  const context = await newContext()
  const page = await openPage(context)
  await completeOnboarding(page, profileJob)
  await waitForShell(page)
  await page.waitForTimeout(250)
  await page.evaluate(() => { window.__tur15Trace = [] })
  await blockPointerInput(page)
  return { context, page }
}

async function freshSporcuTimeline() {
  const { context, page } = await launchFreshProfile('sporcu')
  const shots = {}
  const checkpoints = []
  checkpoints.push(await freshSnapshot(page, 'day 1 immediately after onboarding'))
  shots.day1 = await screenshot(page, 'fresh-sporcu-day1-1500')
  const firstChangePromise = firstMoneyChange(page, checkpoints[0].cash, 18000)
  checkpoints.push(await waitForGameTime(page, 3000, 'day 1 at 25%'))
  checkpoints.push(await waitForGameTime(page, 6000, 'day 1 at 50%'))
  checkpoints.push(await waitForGameTime(page, 9000, 'day 1 at 75%'))
  checkpoints.push(await waitForGameTime(page, 11950, 'immediately before day 2'))
  shots.beforeDay2 = await screenshot(page, 'fresh-sporcu-before-day2')
  checkpoints.push(await waitForGameTime(page, 12020, 'immediately after day 2 begins'))
  shots.day2 = await screenshot(page, 'fresh-sporcu-day2')
  await page.waitForTimeout(1000)
  checkpoints.push(await freshSnapshot(page, '1 second after day 2'))
  checkpoints.push(await waitForGameTime(page, 24020, 'immediately after day 3 begins'))
  shots.day3 = await screenshot(page, 'fresh-sporcu-day3')
  const firstChange = await firstChangePromise
  const events = await trace(page)
  const day1 = checkpoints[0]
  const day2 = checkpoints.find((entry) => entry.label === 'immediately after day 2 begins')
  const day3 = checkpoints.find((entry) => entry.label === 'immediately after day 3 begins')
  assert(day1.cash === 1500, 'Fresh Sporcu: day 1 must start at 1500', day1)
  assert(day2?.cash === 1850, 'Fresh Sporcu: day 2 must be 1850', day2)
  assert(day3?.cash === 2150, 'Fresh Sporcu: day 3 must be 2150', day3)
  assert(day2.cash - day1.cash === 350, 'Fresh Sporcu: day 2 delta must be +300 profile and +50 first_100', { day1, day2 })
  assert(day3.cash - day2.cash === 300, 'Fresh Sporcu: day 3 delta must repeat profile income only', { day2, day3 })
  assert(day2.achievements.includes('first_100'), 'Fresh Sporcu: first_100 must unlock once on day 2', day2)
  assert(!day2.achievements.includes('theme_3'), 'Fresh Sporcu: built-in themes must not unlock theme_3', day2)
  assert(day1.incomePerSecond === 300, 'Fresh Sporcu: incomePerSecond must preserve daily compatibility value 300', day1)
  await context.close()
  return {
    checkpoints,
    firstChange,
    moneyTrace: moneyMethodCalls(events),
    dayEvents: events.filter((entry) => entry.type === 'game_event' && ['day_settled', 'money_changed', 'passive_income', 'career_wage', 'daily_reward', 'offline_earnings', 'comeback_ready'].includes(entry.detail?.event?.type)),
    screenshots: shots,
  }
}

async function profileBonusMatrix() {
  const rows = []
  for (const profileJob of Object.keys(PROFILE_BONUSES)) {
    const { context, page } = await launchFreshProfile(profileJob)
    const before = await freshSnapshot(page, `${profileJob} day 1`)
    await waitForGameTime(page, 12020, `${profileJob} day 2`)
    const after = await freshSnapshot(page, `${profileJob} after day 2`)
    rows.push({
      profileJob,
      configuredDailyBonus: PROFILE_BONUSES[profileJob],
      expectedDelta: expectedFreshDay2Delta(profileJob),
      startCash: before.cash,
      day2Cash: after.cash,
      delta: after.cash - before.cash,
      multiplier: PROFILE_BONUSES[profileJob] === 0 ? null : (after.cash - before.cash) / PROFILE_BONUSES[profileJob],
      incomePerSecond: before.incomePerSecond,
      incomePerDay: before.incomePerDay,
      screenshot: await screenshot(page, `matrix-${profileJob}-day2`),
    })
    assert(after.cash - before.cash === expectedFreshDay2Delta(profileJob), `Profile ${profileJob}: day transition delta must equal configured daily bonus plus legitimate first_100 when eligible`, { before, after })
    await context.close()
  }
  return rows
}

async function careerJobRegression() {
  const { context, page } = await launchFreshProfile('sporcu')
  const before = await freshSnapshot(page, 'career regression before job')
  await page.evaluate(() => document.getElementById('tur15-input-blocker')?.remove())
  await goCareer(page)
  await page.evaluate(() => { window.__tur15Trace = [] })
  await clickCourierJob(page)
  await blockPointerInput(page)
  const afterSelect = await freshSnapshot(page, 'career regression after Kurye select')
  await waitForGameTime(page, 12020, 'career regression day 2')
  const afterDay2 = await freshSnapshot(page, 'career regression after day 2')
  const events = await trace(page)
  const immediateDelta = afterSelect.cash - before.cash
  assert(immediateDelta >= 0 && immediateDelta <= 100, 'Career regression: selecting Kurye must not grant large immediate money', { before, afterSelect })
  assert(afterDay2.cash - before.cash === immediateDelta + PROFILE_BONUSES.sporcu + 180 + 50, 'Career regression: day 2 should include one profile bonus, one Kurye daily wage, and legitimate first_100', { before, afterSelect, afterDay2 })
  await context.close()
  return {
    before,
    afterSelect,
    afterDay2,
    moneyTrace: moneyMethodCalls(events),
    dayEvents: events.filter((entry) => entry.type === 'game_event' && ['day_settled', 'career_wage', 'money_changed'].includes(entry.detail?.event?.type)),
  }
}

async function pauseRegression() {
  const { context, page } = await launchFreshProfile('sporcu')
  const before = await freshSnapshot(page, 'pause before')
  await page.evaluate(() => { window.__tur15State.gamePaused = true })
  await page.waitForTimeout(1500)
  const after = await freshSnapshot(page, 'pause after 1.5s')
  assert(after.cash === before.cash && Math.abs(after.gameTimeMs - before.gameTimeMs) < 80, 'Pause regression: paused game should not accrue time or cash', { before, after })
  await context.close()
  return { before, after }
}

async function themeAchievementProof() {
  const { context, page } = await launchFreshProfile('sporcu')
  await waitForGameTime(page, 12020, 'theme proof day 2')
  const builtIn = await freshSnapshot(page, 'theme proof built-ins only')
  assert(!builtIn.achievements.includes('theme_3'), 'Theme proof: default + light + dark must keep theme_3 locked', builtIn)

  const genuine = await page.evaluate(() => {
    const s = window.__tur15State
    const before = Number(s.money)
    for (const theme of ['season_alpha', 'season_beta', 'season_gamma']) {
      if (typeof s.unlockedThemes?.add === 'function') s.unlockedThemes.add(theme)
      else s.unlockedThemes = Array.from(new Set([...(s.unlockedThemes ?? []), theme]))
    }
    s.checkAchievements()
    const afterFirstCheck = Number(s.money)
    const achievementsAfterFirstCheck = Array.from(s.achievements ?? [])
    s.checkAchievements()
    const afterSecondCheck = Number(s.money)
    return {
      before,
      afterFirstCheck,
      afterSecondCheck,
      firstReward: afterFirstCheck - before,
      repeatedReward: afterSecondCheck - afterFirstCheck,
      achievementsAfterFirstCheck,
      unlockedThemes: Array.from(s.unlockedThemes ?? []),
    }
  })
  assert(genuine.achievementsAfterFirstCheck.includes('theme_3'), 'Theme proof: three genuine season themes must unlock theme_3', genuine)
  assert(genuine.firstReward === 75000, 'Theme proof: theme_3 reward must be 75000 once', genuine)
  assert(genuine.repeatedReward === 0, 'Theme proof: theme_3 reward must not repeat', genuine)
  await context.close()
  return { builtIn, genuine }
}

async function scenarioA(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  const before = await stateSnapshot(page)
  const shot = await screenshot(page, 'scenario-a-offline-modal')
  assert(before.money === START_MONEY, 'Scenario A: loaded money should be fixture start money', before)
  assert(before.pendingOfflineEarnings === OFFLINE_AMOUNT, 'Scenario A: pending offline reward should load exactly', before)
  assert(before.offlineRewardSettlementAt === FIXED_SETTLEMENT_AT, 'Scenario A: settlement identity should load exactly', before)
  assert(before.rewardModals.length === 1 && before.rewardModals[0].rewardId === 'offline', 'Scenario A: exactly one offline reward modal should open', before)
  assert(/Watch|İzle|Izle|Topla|Collect/i.test(before.rewardModals[0].primary), 'Scenario A: offline reward must use watch-and-collect primary copy', before)
  assert(before.rewardModals[0].discard, 'Scenario A: offline reward must expose a discard path', before)
  assert(before.banners.length === 0, 'Scenario A: offline reward must not create a global fixed banner', before)
  await context.close()
  return { before, screenshot: shot }
}

async function scenarioB(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  await closeRewardModal(page)
  const before = await stateSnapshot(page)
  await goCareer(page)
  await page.evaluate(() => { window.__tur15Trace = [] })
  await clickCourierJob(page)
  const after = await stateSnapshot(page)
  const events = await trace(page)
  const shot = await screenshot(page, 'scenario-b-career-no-claim')
  assert(after.money === START_MONEY, 'Scenario B: clicking job before reward claim must not add money', { before, after, events: moneyMethodCalls(events) })
  assert(before.pendingOfflineEarnings === 0, 'Scenario B: X close must discard pending offline reward', before)
  assert(after.pendingOfflineEarnings === 0, 'Scenario B: discarded offline reward must stay cleared after tab/action changes', after)
  assert(after.rewardModals.length === 0 && after.banners.length === 0, 'Scenario B: discarded offline reward must leave no modal or banner behind', after)
  assert(after.career?.jobId, 'Scenario B: job click should still select a job', after)
  await context.close()
  return { before, after, moneyCalls: moneyMethodCalls(events), screenshot: shot }
}

async function scenarioC(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  await closeRewardModal(page)
  const afterClose = await stateSnapshot(page)
  const saveAfterClose = await saved(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await waitForShell(page)
  await page.waitForTimeout(500)
  const afterReload = await stateSnapshot(page)
  const shot = await screenshot(page, 'scenario-c-reload-no-banner')
  assert(afterClose.pendingOfflineEarnings === 0, 'Scenario C: closing modal must discard pending offline reward', afterClose)
  assert(saveAfterClose.pendingOfflineEarnings === 0 && saveAfterClose.offlineRewardSettlementAt === null, 'Scenario C: discarded offline reward must be persisted immediately', saveAfterClose)
  assert(afterReload.money === START_MONEY, 'Scenario C: reload before claim must not add money', afterReload)
  assert(afterReload.rewardModals.length === 0, 'Scenario C: discarded reward must not auto-open after reload', afterReload)
  assert(afterReload.banners.length === 0, 'Scenario C: discarded reward must not return as a banner after reload', afterReload)
  await context.close()
  return { afterClose, saveAfterClose, afterReload, screenshot: shot }
}

async function scenarioD(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  const beforeStale = await stateSnapshot(page)
  await page.evaluate((newSettlementAt) => {
    window.__tur15State.offlineRewardSettlementAt = newSettlementAt
  }, FIXED_SETTLEMENT_AT + 123)
  await claimOfflineModal(page)
  const afterStale = await stateSnapshot(page)
  assert(afterStale.money === START_MONEY, 'Scenario D: stale rendered settlement must not claim money', { beforeStale, afterStale })
  assert(afterStale.pendingOfflineEarnings === OFFLINE_AMOUNT, 'Scenario D: stale rendered settlement must not clear pending reward', afterStale)
  await context.close()

  const success = await launchWithSave(offlineFixture(base))
  const page2 = success.page
  await page2.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  const beforeClaim = await stateSnapshot(page2)
  await page2.evaluate(() => { window.__tur15Trace = [] })
  await claimOfflineModal(page2)
  const afterClaim = await stateSnapshot(page2)
  const claimTrace = await trace(page2)
  const repeat = await page2.evaluate((settlementAt) => {
    const before = window.__tur15State.money
    const result = window.__tur15State.claimOfflineReward(settlementAt, 1)
    return { before, result, after: window.__tur15State.money }
  }, FIXED_SETTLEMENT_AT)
  const saveAfter = await saved(page2)
  assert(afterClaim.money === START_MONEY + OFFLINE_AMOUNT, 'Scenario D: first real claim should add exactly one offline amount', { beforeClaim, afterClaim, claimTrace: moneyMethodCalls(claimTrace) })
  assert(afterClaim.pendingOfflineEarnings === 0, 'Scenario D: successful claim should clear pending reward', afterClaim)
  assert(repeat.result === 0 && repeat.after === repeat.before, 'Scenario D: repeated claim should add zero', repeat)
  assert(saveAfter.pendingOfflineEarnings === 0 && saveAfter.offlineRewardSettlementAt === null, 'Scenario D: saved state should clear claimed offline reward', saveAfter)
  await success.context.close()
  return { stale: { beforeStale, afterStale }, success: { beforeClaim, afterClaim, repeat, saveAfter, claimTrace: moneyMethodCalls(claimTrace) } }
}

async function scenarioE(base) {
  const save = offlineFixture(base, {
    comebackPending: 22222,
    comebackSettlementAt: FIXED_SETTLEMENT_AT + 5000,
    comebackPresentedSettlementAt: 0,
  })
  const { context, page } = await launchWithSave(save)
  const initial = await stateSnapshot(page)
  assert(initial.rewardModals.length === 1 && initial.rewardModals[0].rewardId === 'offline', 'Scenario E: old comeback save data must not preempt the offline modal', initial)
  assert(initial.comebackPending === 0 && initial.shouldPresentComeback === false, 'Scenario E: old comeback pending state must be cleared on load', initial)
  await claimOfflineModal(page)
  await page.waitForTimeout(500)
  const afterOffline = await stateSnapshot(page)
  assert(afterOffline.money === START_MONEY + OFFLINE_AMOUNT, 'Scenario E: offline claim should add exactly offline amount first', afterOffline)
  assert(afterOffline.rewardModals.every((modal) => modal.rewardId !== 'comeback'), 'Scenario E: comeback modal must never be created', afterOffline)
  assert(afterOffline.banners.every((banner) => banner.action !== 'claim_comeback'), 'Scenario E: comeback banner must never be created', afterOffline)
  assert(afterOffline.comebackPending === 0, 'Scenario E: comeback reward must remain cleared after offline claim', afterOffline)
  const directComeback = await page.evaluate(() => {
    const before = window.__tur15State.money
    const result = window.__tur15State.claimComebackViaAd(1)
    return { before, result, after: window.__tur15State.money, comebackPending: window.__tur15State.comebackPending }
  })
  assert(directComeback.result === 0 && directComeback.after === directComeback.before && directComeback.comebackPending === 0, 'Scenario E: direct comeback claim must not pay money', directComeback)
  const shot = await screenshot(page, 'scenario-e-offline-no-comeback')
  await context.close()
  return { initial, afterOffline, directComeback, screenshot: shot }
}

async function scenarioF(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  const modalShot = await screenshot(page, 'scenario-f-modal-image-check')
  await closeRewardModal(page)
  const bannerShot = await screenshot(page, 'scenario-f-no-banner-image-check')
  const scan = await stateSnapshot(page)
  assert(scan.banners.length === 0, 'Scenario F: dismissed offline reward must not render a persistent banner', scan)
  assert(scan.brokenImages.length === 0, 'Scenario F: no broken rendered images detected', scan)
  assert(scan.failedImageRequests.length === 0, 'Scenario F: no failed image requests detected', scan)
  await context.close()
  return { scan, screenshots: { modal: modalShot, banner: bannerShot } }
}

async function scenarioH(base) {
  const { context, page } = await launchWithSave(offlineFixture(base))
  await page.locator('.ref-reward-primary[data-reward-id="offline"]').waitFor({ state: 'visible', timeout: 10000 })
  await page.evaluate(() => { window.__tur15AdFail = true })
  await claimOfflineModal(page)
  const afterFail = await stateSnapshot(page)
  assert(afterFail.money === START_MONEY, 'Scenario H: failed/cancelled ad must not add money', afterFail)
  assert(afterFail.pendingOfflineEarnings === OFFLINE_AMOUNT, 'Scenario H: failed/cancelled ad must keep pending offline reward', afterFail)
  assert(afterFail.rewardModals.length === 1 && afterFail.rewardModals[0].rewardId === 'offline', 'Scenario H: failed/cancelled ad should keep the modal available', afterFail)
  await context.close()
  return { afterFail }
}

async function scenarioI(base) {
  const { context, page } = await launchWithSave(offlineFixture(base, {
    pendingOfflineEarnings: 0,
    offlineRewardSettlementAt: null,
    offlineRewardPresentedSettlementAt: null,
  }))
  await page.waitForTimeout(500)
  const snapshot = await stateSnapshot(page)
  assert(snapshot.rewardModals.length === 0, 'Scenario I: zero offline reward must not open a modal', snapshot)
  assert(snapshot.banners.length === 0, 'Scenario I: zero offline reward must not create a banner', snapshot)
  await context.close()
  return { snapshot }
}

async function scenarioJ(base) {
  const dailySave = offlineFixture(base, {
    pendingOfflineEarnings: 0,
    offlineRewardSettlementAt: null,
    offlineRewardPresentedSettlementAt: null,
    dailyLastClaim: todayKey(-1),
    playTimeMs: 240_000,
    firstBusinessPlayTimeMs: 0,
    producers: { ...(base.producers ?? {}), stajyer: 1 },
  })
  const daily = await launchWithSave(dailySave)
  await daily.page.locator('.ref-reward-primary[data-reward-id="daily"]').waitFor({ state: 'visible', timeout: 10000 })
  const dailyBefore = await stateSnapshot(daily.page)
  const dailyStartMoney = dailyBefore.money
  await daily.page.locator('.ref-reward-primary[data-reward-id="daily"]').first().click()
  await daily.page.waitForTimeout(500)
  const dailyAfter = await stateSnapshot(daily.page)
  assert(dailyBefore.rewardModals.length === 1 && dailyBefore.rewardModals[0].rewardId === 'daily', 'Scenario J: daily reward modal must still open when eligible', dailyBefore)
  assert(dailyAfter.money > dailyStartMoney, 'Scenario J: daily reward claim must still add money', { dailyBefore, dailyAfter })
  await daily.context.close()

  const bankruptcySave = offlineFixture(base, {
    pendingOfflineEarnings: 0,
    offlineRewardSettlementAt: null,
    offlineRewardPresentedSettlementAt: null,
    bankruptcyRecoveryPool: 10000,
    bankruptcyRecoveryClaimed: false,
    bankruptcySeizedSnapshot: [],
  })
  const bankruptcy = await launchWithSave(bankruptcySave)
  await bankruptcy.page.locator('.ref-reward-primary[data-reward-id="bankruptcy"]').waitFor({ state: 'visible', timeout: 10000 })
  const bankruptcyBefore = await stateSnapshot(bankruptcy.page)
  const bankruptcyStartMoney = bankruptcyBefore.money
  await bankruptcy.page.locator('.ref-reward-primary[data-reward-id="bankruptcy"]').first().click()
  await bankruptcy.page.waitForTimeout(500)
  const bankruptcyAfter = await stateSnapshot(bankruptcy.page)
  assert(bankruptcyBefore.rewardModals.length === 1 && bankruptcyBefore.rewardModals[0].rewardId === 'bankruptcy', 'Scenario J: bankruptcy reward modal must still open when eligible', bankruptcyBefore)
  assert(bankruptcyAfter.money > bankruptcyStartMoney, 'Scenario J: bankruptcy reward claim must still add money', { bankruptcyBefore, bankruptcyAfter })
  await bankruptcy.context.close()

  return { daily: { before: dailyBefore, after: dailyAfter }, bankruptcy: { before: bankruptcyBefore, after: bankruptcyAfter } }
}

function scenarioGSourceAudit() {
  const files = [
    'src/main.ts',
    'src/game/GameState.ts',
    'src/ui/ref/RefRewardQueue.ts',
  ]
  const hits = []
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    if (text.includes('__tur15')) hits.push(file)
  }
  assert(hits.length === 0, 'Scenario G: production source must not contain TUR15 test globals', hits)
  return { checkedFiles: files, tur15GlobalHits: hits }
}

try {
  const achievementAudit = achievementStaticAssertions()
  browser = await chromium.launch()
  const base = await makeBaseSave()
  const results = {
    url,
    screenshotDir,
    fixtures: {
      startMoney: START_MONEY,
      offlineAmount: OFFLINE_AMOUNT,
      settlementAt: FIXED_SETTLEMENT_AT,
      source: 'encoded localStorage save fixture',
    },
    routeInstrumentation: 'Playwright route transform only',
    achievementAudit,
    freshInSession: {
      sporcuTimeline: await freshSporcuTimeline(),
      themeAchievementProof: await themeAchievementProof(),
      profileMatrix: await profileBonusMatrix(),
      careerJobRegression: await careerJobRegression(),
      pauseRegression: await pauseRegression(),
      timeSkipAudit: 'Production RefApp has no mounted time-skip UI; legacy HUD time-skip uses incomePerDay() * elapsed game days.',
    },
    scenarios: {
      A: await scenarioA(base),
      B: await scenarioB(base),
      C: await scenarioC(base),
      D: await scenarioD(base),
      E: await scenarioE(base),
      F: await scenarioF(base),
      G: scenarioGSourceAudit(),
      H: await scenarioH(base),
      I: await scenarioI(base),
      J: await scenarioJ(base),
    },
    routeHits,
  }
  assert(routeHits.main > 0, 'Playwright main.ts route instrumentation did not run', routeHits)
  const summary = {
    url,
    screenshotDir,
    resultsPath: path.join(screenshotDir, 'tur15-a1-results.json'),
    freshSporcuCash: results.freshInSession.sporcuTimeline.checkpoints
      .filter((entry) => ['day 1 immediately after onboarding', 'immediately after day 2 begins', 'immediately after day 3 begins'].includes(entry.label))
      .map((entry) => ({ label: entry.label, gameTimeMs: entry.gameTimeMs, gameDay: entry.gameDay, cash: entry.cash, incomePerSecond: entry.incomePerSecond, incomePerDay: entry.incomePerDay })),
    firstMoneyChange: results.freshInSession.sporcuTimeline.firstChange
      ? {
          before: {
            label: results.freshInSession.sporcuTimeline.firstChange.before.label,
            gameTimeMs: results.freshInSession.sporcuTimeline.firstChange.before.gameTimeMs,
            gameDay: results.freshInSession.sporcuTimeline.firstChange.before.gameDay,
            cash: results.freshInSession.sporcuTimeline.firstChange.before.cash,
          },
          after: {
            label: results.freshInSession.sporcuTimeline.firstChange.after.label,
            gameTimeMs: results.freshInSession.sporcuTimeline.firstChange.after.gameTimeMs,
            gameDay: results.freshInSession.sporcuTimeline.firstChange.after.gameDay,
            cash: results.freshInSession.sporcuTimeline.firstChange.after.cash,
          },
        }
      : null,
    profileMatrix: results.freshInSession.profileMatrix.map((row) => ({
      profileJob: row.profileJob,
      configuredDailyBonus: row.configuredDailyBonus,
      expectedDelta: row.expectedDelta,
      delta: row.delta,
      multiplier: row.multiplier,
      incomePerSecond: row.incomePerSecond,
      incomePerDay: row.incomePerDay,
      screenshot: row.screenshot,
    })),
    achievementAudit: results.achievementAudit,
    themeAchievementProof: {
      builtInTheme3Unlocked: results.freshInSession.themeAchievementProof.builtIn.achievements.includes('theme_3'),
      builtInTheme3Reward: 0,
      genuineTheme3FirstReward: results.freshInSession.themeAchievementProof.genuine.firstReward,
      genuineTheme3RepeatedReward: results.freshInSession.themeAchievementProof.genuine.repeatedReward,
    },
    careerJobRegression: {
      immediateDelta: results.freshInSession.careerJobRegression.afterSelect.cash - results.freshInSession.careerJobRegression.before.cash,
      day2Delta: results.freshInSession.careerJobRegression.afterDay2.cash - results.freshInSession.careerJobRegression.before.cash,
      day2Cash: results.freshInSession.careerJobRegression.afterDay2.cash,
    },
    pauseRegression: {
      cashDelta: results.freshInSession.pauseRegression.after.cash - results.freshInSession.pauseRegression.before.cash,
      gameTimeDelta: results.freshInSession.pauseRegression.after.gameTimeMs - results.freshInSession.pauseRegression.before.gameTimeMs,
    },
    offlineRegression: {
      firstClaimCash: results.scenarios.D.success.afterClaim.money,
      repeatedClaimResult: results.scenarios.D.success.repeat.result,
      staleClaimCash: results.scenarios.D.stale.afterStale.money,
      discardedPending: results.scenarios.C.afterClose.pendingOfflineEarnings,
      comebackPendingAfterLoad: results.scenarios.E.initial.comebackPending,
      failedAdCash: results.scenarios.H.afterFail.money,
      zeroOfflineModalCount: results.scenarios.I.snapshot.rewardModals.length,
      bannerCountAfterDismiss: results.scenarios.F.scan.banners.length,
      dailyClaimDelta: results.scenarios.J.daily.after.money - results.scenarios.J.daily.before.money,
      bankruptcyClaimDelta: results.scenarios.J.bankruptcy.after.money - results.scenarios.J.bankruptcy.before.money,
      brokenImages: results.scenarios.F.scan.brokenImages.length,
      failedImageRequests: results.scenarios.F.scan.failedImageRequests.length,
    },
    routeHits,
  }
  fs.writeFileSync(summary.resultsPath, JSON.stringify(results, null, 2))
  console.log('TUR15_A1_RESULTS_START')
  console.log(JSON.stringify(summary, null, 2))
  console.log('TUR15_A1_RESULTS_END')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
