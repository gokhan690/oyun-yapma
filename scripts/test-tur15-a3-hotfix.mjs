import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const progressPath = path.join(os.tmpdir(), 'tur15-a3-hotfix-progress.log')
const MS_PER_GAME_DAY = 12_000

function progress(message) {
  fs.appendFileSync(progressPath, `${new Date().toISOString()} ${message}\n`)
  console.log(message)
}

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail == null ? '' : `\n${JSON.stringify(detail, null, 2)}`
    throw new Error(`${message}${suffix}`)
  }
}

function assertSourceGuards() {
  const pacing = fs.readFileSync('src/game/EventPacing.ts', 'utf8')
  const bridge = fs.readFileSync('src/ui/ref/RefNotificationBridge.ts', 'utf8')
  const rewards = fs.readFileSync('src/ui/ref/RefRewardQueue.ts', 'utf8')
  const normalFn = pacing.match(/export function isNormalSeriousDecision[\s\S]*?\n}/)?.[0] ?? ''

  assert(/SERIOUS_DECISION_EVENT_COOLDOWN_DAYS\s*=\s*90/.test(pacing), 'same event ID cooldown must be 90 days')
  assert(/SERIOUS_DECISION_FAMILY_COOLDOWN_DAYS\s*=\s*45/.test(pacing), 'same rival/event family cooldown must be 45 days')
  assert(/MINOR_RIVAL_NOTICE_COOLDOWN_DAYS\s*=\s*30/.test(pacing), 'minor rival notices must be throttled for 30 days')
  assert(/lv >= 5\) return \{ min: 15, max: 25 \}/.test(pacing), 'level 5 serious decision range must be 15-25 days')
  assert(/lv >= 4\) return \{ min: 20, max: 35 \}/.test(pacing), 'level 4 serious decision range must be 20-35 days')
  assert(/lv >= 3\) return \{ min: 30, max: 50 \}/.test(pacing), 'level 3 serious decision range must be 30-50 days')
  assert(/return \{ min: 45, max: 75 \}/.test(pacing), 'level 1-2 serious decision range must be 45-75 days')
  assert(/majorFamily === 'rival'/.test(normalFn), 'normal serious decisions must explicitly allow rival events')
  assert(/majorFamily === 'rival_financial'/.test(normalFn), 'normal serious decisions must explicitly allow rival financial events')
  assert(!/major_crisis|major_financial_crisis|war/.test(normalFn), 'critical crisis families must not be normal serious decisions')
  assert(/MAX_DECISION_QUEUE\s*=\s*1/.test(bridge), 'decision queue limit must be 1')
  assert(/MAX_SERIOUS_DECISIONS_PER_SESSION\s*=\s*2/.test(bridge), 'session serious decision limit must be 2')
  assert(/SESSION_START_DECISION_SUPPRESS_MS\s*=\s*90_000/.test(bridge), 'startup suppression must be 90 seconds')
  assert(/DECISION_CLOSE_GAP_MS\s*=\s*15_000/.test(bridge), 'modal close gap must be 15 seconds')
  assert(/DECISION_INPUT_LOCK_MS\s*=\s*1_000/.test(bridge), 'decision input lock must be 1000ms')
  assert(/lastExternalModalClosedAtMs/.test(bridge), 'bridge must track external modal close time')
  assert(/notifyExternalModalClosed/.test(bridge), 'bridge must expose external modal close notification')
  assert(/decisionBusy/.test(bridge) && /setDecisionOptionsDisabled\(true\)/.test(bridge), 'decision modal must have a busy guard')
  assert(/try\s*\{[\s\S]*?opt\.resolve/.test(bridge), 'decision resolve must not leave modal busy on exception')
  assert(/onOpenChange/.test(rewards), 'reward queue must expose open/close state changes')
}

const initClock = () => {
  window.__tur15Now = 1_800_000_000_000
  Date.now = () => window.__tur15Now
  window.__tur15Advance = (ms) => { window.__tur15Now += ms; return window.__tur15Now }
}

async function instrumentContext(context) {
  await context.addInitScript(initClock)
  await context.route('**/src/ui/ref/RefApp.ts*', async (route) => {
    const response = await route.fetch()
    const text = await response.text()
    const body = text.replace(
      /constructor\(opts[^)]*\)\s*\{/,
      (match) => `${match}\n    globalThis.__tur15RefApp = this`,
    )
    assert(body !== text, 'A3 hotfix route patch: RefApp constructor anchor not found')
    await route.fulfill({ response, body, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
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
      throw new Error('A3 hotfix route patch: state construction anchor not found')
    }
    if (body.includes('const freshState = new GameState();')) {
      body = body.replaceAll(
        'const freshState = new GameState();',
        'const freshState = new GameState();\nglobalThis.__tur15State = freshState;',
      )
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
}

async function completeOnboarding(page) {
  if (!(await page.locator('.onboarding-overlay').isVisible().catch(() => false))) return
  const english = page.locator('.onboarding-lang-btn').filter({ hasText: /English/i }).first()
  if (await english.isVisible().catch(() => false)) await english.click()
  const next = page.locator('.onboarding-next-btn').first()
  for (let i = 0; i < 2; i++) {
    if (await next.isVisible().catch(() => false)) await next.click()
  }
  const name = page.locator('.ob-name-input').first()
  if (await name.isVisible().catch(() => false)) {
    await name.fill('Baron')
    await next.click()
  }
  for (let i = 0; i < 5; i++) {
    if (await page.locator('.onboarding-start-btn').isVisible().catch(() => false)) break
    if (await next.isVisible().catch(() => false)) await next.click()
    await page.waitForTimeout(50)
  }
  const start = page.locator('.onboarding-start-btn').first()
  if (await start.isVisible().catch(() => false)) await start.click()
  await page.waitForSelector('.ref-shell', { timeout: 20000 })
}

async function resetState(page, level = 1) {
  await page.evaluate((firmLevel) => {
    const s = window.__tur15State
    const app = window.__tur15RefApp
    const bridge = app?.notifBridge
    const rewardQueue = app?.rewardQueue
    s.stopTick?.()
    s.gamePaused = true
    s.gameTimeMs = 0
    s.money = 1_000_000
    s.totalEarned = 1_000_000
    s.reputation = 80
    for (const key of Object.keys(s.producers)) s.producers[key] = 0
    s.producers.stajyer = 1
    s.producerLevels = { stajyer: firmLevel }
    s.activeRivalEvents = []
    s.activeCrisis = null
    s.pendingDecisions = []
    s.pendingOfflineEarnings = 0
    s.offlineRewardSettlementAt = null
    s.offlineRewardPresentedSettlementAt = null
    s.eventPacing = {
      lastByDedupeKey: {},
      lastByFamily: {},
      majorByDay: {},
      lastSeriousDecisionDay: null,
      nextSeriousDecisionDay: null,
      lastSeriousDecisionByEventId: {},
      lastSeriousDecisionByFamily: {},
    }
    document.querySelectorAll('.ref-decision-overlay, .ref-reward-overlay').forEach((el) => el.remove())
    if (bridge) {
      if (bridge.decisionUnlockTimer !== null) clearTimeout(bridge.decisionUnlockTimer)
      bridge.queue = []
      bridge.queuedDecisionKeys = new Set()
      bridge.currentDecisionKey = null
      bridge.overlay = null
      bridge.lastSeenGameDay = -1
      bridge.lastDecisionClosedAtMs = 0
      bridge.lastExternalModalClosedAtMs = 0
      bridge.seriousDecisionsShownThisSession = 0
      bridge.decisionUnlockTimer = null
      bridge.decisionInputLockedUntilMs = 0
      bridge.decisionBusy = false
    }
    if (rewardQueue) {
      rewardQueue.queue = []
      rewardQueue.overlay = null
      rewardQueue.busy = false
      rewardQueue.allDoneFired = false
    }
  }, level)
}

async function setGameDay(page, day) {
  await page.evaluate((nextDay) => {
    window.__tur15State.gameTimeMs = (nextDay - 1) * 12_000
    window.__tur15State.emit({ type: 'game_time' })
  }, day)
}

async function advanceRealClock(page, ms) {
  await page.evaluate((delta) => {
    window.__tur15Advance(delta)
    window.__tur15State.emit({ type: 'game_time' })
  }, ms)
}

async function emitRivalDecision(page, eventId, opts = {}) {
  await page.evaluate(({ id, replace, rivalId, kind }) => {
    const s = window.__tur15State
    const event = {
      id,
      rivalId: rivalId ?? 'kocak',
      rivalName: 'Kocak Holding',
      kind: kind ?? 'business_competition',
      headline: `A3 hotfix ${id}`,
      description: 'Controlled decision event',
      reputationDamage: 0,
      moneyDamage: 0,
      responses: [
        { id: 'ignore', label: 'Ignore', emoji: '*', cost: 0, reputationDelta: 0 },
      ],
      expiresAtDay: 9999,
    }
    s.activeRivalEvents = replace
      ? [event]
      : [...s.activeRivalEvents.filter((existing) => existing.id !== id), event]
    s.emit({ type: 'rival_event', event })
  }, { id: eventId, replace: opts.replace ?? false, rivalId: opts.rivalId, kind: opts.kind })
}

async function emitCrisis(page, crisisId = 'economic') {
  await page.evaluate((id) => {
    const s = window.__tur15State
    s.activeCrisis = {
      crisisId: id,
      startedAt: Date.now(),
      expiresAt: Date.now() + 120_000,
      resolved: false,
    }
    s.emit({ type: 'crisis_started', crisisId: id, title: `Crisis ${id}` })
  }, crisisId)
}

async function waitForDecision(page) {
  await page.waitForSelector('.ref-decision-overlay', { state: 'visible', timeout: 5000 })
}

async function waitForUnlock(page) {
  const firstButton = page.locator('.ref-decision-opt').first()
  await page.waitForTimeout(1100)
  await page.evaluate(() => { window.__tur15Advance(1100) })
  await firstButton.waitFor({ state: 'visible' })
  assert(!(await firstButton.isDisabled()), 'decision option must unlock after 1000ms')
}

async function resolveCurrentDecision(page, clickCount = 1) {
  await waitForUnlock(page)
  const firstButton = page.locator('.ref-decision-opt').first()
  if (clickCount === 2) await firstButton.dblclick({ delay: 10 })
  else await firstButton.click()
  await page.waitForSelector('.ref-decision-overlay', { state: 'detached', timeout: 5000 })
}

async function resolveCurrentDecisionAndWaitForReplacement(page) {
  const before = await bridgeSnapshot(page)
  assert(before.currentDecisionKey, 'replacement-aware resolve requires an active decision', before)
  await waitForUnlock(page)
  await page.locator('.ref-decision-opt').first().click()
  await page.waitForFunction((previousKey) => {
    const bridge = window.__tur15RefApp?.notifBridge
    const overlayCount = document.querySelectorAll('.ref-decision-overlay').length
    return overlayCount === 0 || (
      bridge?.currentDecisionKey != null
      && bridge.currentDecisionKey !== previousKey
    )
  }, before.currentDecisionKey, { timeout: 5000 })
  const after = await bridgeSnapshot(page)
  return { previousKey: before.currentDecisionKey, currentKey: after.currentDecisionKey }
}

async function openReward(page) {
  await page.evaluate(() => {
    const s = window.__tur15State
    s.pendingOfflineEarnings = 76_500
    s.offlineRewardSettlementAt = 1_800_000_123_000
    s.offlineRewardPresentedSettlementAt = null
    window.__tur15RefApp.rewardQueue.start()
  })
  await page.waitForSelector('.ref-reward-overlay', { state: 'visible', timeout: 5000 })
}

async function closeReward(page) {
  await page.locator('.ref-reward-close').click()
  await page.waitForSelector('.ref-reward-overlay', { state: 'detached', timeout: 5000 })
}

async function bridgeSnapshot(page) {
  return page.evaluate(() => {
    const bridge = window.__tur15RefApp.notifBridge
    return {
      queueLength: bridge.queue.length,
      normalQueued: bridge.queue.filter((item) => item.meta.majorFamily === 'rival' || item.meta.majorFamily === 'rival_financial').length,
      keys: bridge.queue.map((item) => item.key),
      seriousShown: bridge.seriousDecisionsShownThisSession,
      currentDecisionKey: bridge.currentDecisionKey,
      lastExternalModalClosedAtMs: bridge.lastExternalModalClosedAtMs,
    }
  })
}

async function pacingSnapshot(page) {
  return page.evaluate(() => ({
    nextSeriousDecisionDay: window.__tur15State.eventPacing.nextSeriousDecisionDay,
    seriousEventKeys: Object.keys(window.__tur15State.eventPacing.lastSeriousDecisionByEventId),
    seriousFamilyKeys: Object.keys(window.__tur15State.eventPacing.lastSeriousDecisionByFamily),
    lastSeriousDecisionDay: window.__tur15State.eventPacing.lastSeriousDecisionDay,
  }))
}

async function runHelperBoundaryChecks(page) {
  return page.evaluate(async () => {
    const mod = await import('/src/game/EventPacing.ts')
    const rivalEvent = (id, rivalId = 'atlas', kind = 'business_competition') => ({
      type: 'rival_event',
      event: {
        id,
        rivalId,
        rivalName: rivalId,
        kind,
        headline: id,
        description: id,
        reputationDamage: 0,
        moneyDamage: 0,
        responses: [{ id: 'ignore', label: 'Ignore', emoji: '*', cost: 0, reputationDelta: 0 }],
        expiresAtDay: 999,
      },
    })
    const crisis = { type: 'crisis_started', crisisId: 'economic', title: 'Economic' }

    const eventState = mod.createEventPacingState()
    const metaA = mod.getEventPacingMeta(rivalEvent('event_a'))
    mod.consumePacedEvent(eventState, metaA, 10, { firmLevel: 1, seedKey: 'event-boundary' })
    eventState.nextSeriousDecisionDay = null
    const eventDay89 = mod.canConsumePacedEvent(eventState, metaA, 99, { firmLevel: 1, seedKey: 'event-boundary' })
    const eventDay90 = mod.canConsumePacedEvent(eventState, metaA, 100, { firmLevel: 1, seedKey: 'event-boundary' })

    const familyState = mod.createEventPacingState()
    const metaFamilyA = mod.getEventPacingMeta(rivalEvent('family_a', 'atlas', 'business_competition'))
    const metaFamilyB = mod.getEventPacingMeta(rivalEvent('family_b', 'atlas', 'business_competition'))
    mod.consumePacedEvent(familyState, metaFamilyA, 10, { firmLevel: 1, seedKey: 'family-boundary' })
    familyState.nextSeriousDecisionDay = null
    const familyDay44 = mod.canConsumePacedEvent(familyState, metaFamilyB, 54, { firmLevel: 1, seedKey: 'family-boundary' })
    const familyDay45 = mod.canConsumePacedEvent(familyState, metaFamilyB, 55, { firmLevel: 1, seedKey: 'family-boundary' })

    const crisisState = mod.createEventPacingState()
    const crisisMeta = mod.getEventPacingMeta(crisis)
    const crisisNormal = mod.isNormalSeriousDecision(crisisMeta)
    mod.consumePacedEvent(crisisState, crisisMeta, 10, { firmLevel: 5, seedKey: 'crisis' })

    const quotaState = mod.createEventPacingState()
    quotaState.majorByDay['20'] = 1
    const quotaNormalMeta = mod.getEventPacingMeta(rivalEvent('quota_normal', 'atlas', 'business_competition'))
    const quotaCriticalMeta = mod.getEventPacingMeta({ type: 'crisis_started', crisisId: 'rival_attack', title: 'Attack' })
    const quotaNormalAllowed = mod.canConsumePacedEvent(quotaState, quotaNormalMeta, 20, { firmLevel: 1, seedKey: 'quota-normal' })
    const quotaCriticalAllowed = mod.canConsumePacedEvent(quotaState, quotaCriticalMeta, 20, { firmLevel: 1, seedKey: 'quota-critical' })
    mod.consumePacedEvent(quotaState, quotaCriticalMeta, 20, { firmLevel: 1, seedKey: 'quota-critical' })
    const quotaAfterCritical = quotaState.majorByDay['20']

    return {
      eventDay89,
      eventDay90,
      familyDay44,
      familyDay45,
      crisisNormal,
      crisisSeriousKeys: Object.keys(crisisState.lastSeriousDecisionByEventId),
      crisisNextDay: crisisState.nextSeriousDecisionDay,
      quotaNormalAllowed,
      quotaCriticalAllowed,
      quotaAfterCritical,
    }
  })
}

async function main() {
  fs.writeFileSync(progressPath, '')
  progress('A3 hotfix: source guard checks')
  assertSourceGuards()

  progress('A3 hotfix: launch browser')
  const browser = await chromium.launch()
  let context
  try {
    context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 430, height: 860 } })
    await instrumentContext(context)
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    progress('A3 hotfix: open app')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    progress('A3 hotfix: complete onboarding')
    await completeOnboarding(page)
    await page.waitForFunction(() => !!window.__tur15State && !!window.__tur15RefApp, null, { timeout: 15000 })

    progress('A3 hotfix: helper boundary checks')
    const boundaries = await runHelperBoundaryChecks(page)
    assert(boundaries.eventDay89 === false, 'same event ID must be blocked at day 89', boundaries)
    assert(boundaries.eventDay90 === true, 'same event ID must be allowed at day 90', boundaries)
    assert(boundaries.familyDay44 === false, 'same family must be blocked at day 44', boundaries)
    assert(boundaries.familyDay45 === true, 'same family must be allowed at day 45', boundaries)
    assert(boundaries.crisisNormal === false, 'crisis must not be classified as a normal serious decision', boundaries)
    assert(boundaries.crisisSeriousKeys.length === 0 && boundaries.crisisNextDay === null, 'crisis must not consume serious rival cooldown history', boundaries)
    assert(boundaries.quotaNormalAllowed === false, 'normal major decision must respect full daily major quota', boundaries)
    assert(boundaries.quotaCriticalAllowed === true, 'critical decision must bypass full daily major quota', boundaries)
    assert(boundaries.quotaAfterCritical === 1, 'critical decision must not increment normal daily major quota', boundaries)

    progress('A3 hotfix: startup suppression excludes crisis')
    await resetState(page, 1)
    await emitRivalDecision(page, 'startup_normal')
    await page.waitForTimeout(100)
    assert(await page.locator('.ref-decision-overlay').count() === 0, 'startup suppression must block normal serious decisions')
    await emitCrisis(page, 'economic')
    await waitForDecision(page)
    let modalBox = await page.locator('.ref-decision-overlay').boundingBox()
    assert(modalBox && modalBox.width <= 430, 'decision modal must fit 430px viewport', modalBox)
    let snap = await bridgeSnapshot(page)
    assert(snap.seriousShown === 0, 'crisis must not increment normal serious session counter', snap)
    let pacing = await pacingSnapshot(page)
    assert(pacing.seriousEventKeys.length === 0 && pacing.nextSeriousDecisionDay === null, 'crisis display must not write serious rival cooldown history', pacing)

    progress('A3 hotfix: input lock and double click delta')
    await resetState(page, 1)
    await advanceRealClock(page, 91_000)
    await emitRivalDecision(page, 'double_click_normal')
    await waitForDecision(page)
    const firstButton = page.locator('.ref-decision-opt').first()
    assert(await firstButton.isDisabled(), 'decision option must be disabled during first 1000ms')
    await firstButton.evaluate((btn) => btn.click())
    const lockedPending = await page.evaluate(() => window.__tur15State.activeRivalEvents.length)
    assert(lockedPending === 1, 'programmatic click during lock must not resolve decision')
    await page.evaluate(() => {
      const s = window.__tur15State
      s.__tur15ResolveCalls = 0
      const original = s.resolveRivalEvent.bind(s)
      s.resolveRivalEvent = function(...args) {
        this.__tur15ResolveCalls += 1
        return original(...args)
      }
    })
    await resolveCurrentDecision(page, 2)
    const doubleClick = await page.evaluate(() => ({
      calls: window.__tur15State.__tur15ResolveCalls,
      active: window.__tur15State.activeRivalEvents.length,
    }))
    assert(doubleClick.calls === 1 && doubleClick.active === 0, 'fast double click must resolve exactly once', doubleClick)

    progress('A3 hotfix: session limit does not drop crisis')
    await resetState(page, 1)
    await advanceRealClock(page, 91_000)
    await setGameDay(page, 1)
    await emitRivalDecision(page, 'session_normal_1')
    await waitForDecision(page)
    await resolveCurrentDecision(page)
    await advanceRealClock(page, 16_000)
    await setGameDay(page, 100)
    await emitRivalDecision(page, 'session_normal_2')
    await waitForDecision(page)
    await resolveCurrentDecision(page)
    await advanceRealClock(page, 16_000)
    await setGameDay(page, 200)
    await emitRivalDecision(page, 'session_normal_3')
    await page.waitForTimeout(100)
    assert(await page.locator('.ref-decision-overlay').count() === 0, 'third normal serious decision must not show in same session')
    snap = await bridgeSnapshot(page)
    assert(snap.seriousShown === 2, 'normal serious session counter must stop at 2', snap)
    await emitCrisis(page, 'scandal')
    await waitForDecision(page)
    snap = await bridgeSnapshot(page)
    assert(snap.seriousShown === 2, 'crisis must not increment normal serious session counter after limit', snap)

    progress('A3 hotfix: normal queue limit does not drop crisis')
    await resetState(page, 1)
    await advanceRealClock(page, 91_000)
    await emitRivalDecision(page, 'queue_active_normal')
    await waitForDecision(page)
    await emitRivalDecision(page, 'queue_waiting_normal')
    await emitCrisis(page, 'rival_attack')
    snap = await bridgeSnapshot(page)
    assert(snap.normalQueued <= 1 && snap.keys.some((key) => key === 'crisis:rival_attack'), 'critical crisis must queue despite one normal queued', snap)
    const replacement = await resolveCurrentDecisionAndWaitForReplacement(page)
    assert(replacement.previousKey === 'rival:queue_active_normal', 'normal queue test must resolve the active normal decision', replacement)
    assert(replacement.currentKey === 'crisis:rival_attack', 'replacement modal must be the queued crisis decision', replacement)
    await waitForDecision(page)
    snap = await bridgeSnapshot(page)
    assert(snap.currentDecisionKey === 'crisis:rival_attack', 'queued critical crisis must be the next opened decision', snap)
    pacing = await pacingSnapshot(page)
    assert(pacing.lastSeriousDecisionDay != null && !pacing.seriousEventKeys.includes('crisis:rival_attack'), 'crisis must not consume serious event cooldown after queued normal', pacing)

    progress('A3 hotfix: reward open suppresses normal and close gap is enforced')
    await resetState(page, 1)
    await advanceRealClock(page, 91_000)
    await openReward(page)
    await emitRivalDecision(page, 'reward_normal')
    await page.waitForTimeout(100)
    assert(await page.locator('.ref-decision-overlay').count() === 0, 'normal decision must not open while reward modal is open')
    snap = await bridgeSnapshot(page)
    assert(snap.normalQueued === 1, 'normal decision must remain queued while reward modal is open', snap)
    await closeReward(page)
    const closedAt = (await bridgeSnapshot(page)).lastExternalModalClosedAtMs
    await advanceRealClock(page, 14_999)
    assert(await page.locator('.ref-decision-overlay').count() === 0, 'normal decision must not open at reward close +14.999s')
    const after14999 = (await bridgeSnapshot(page)).lastExternalModalClosedAtMs
    assert(after14999 === closedAt, 'reward close timestamp must not be updated twice before 15s', { closedAt, after14999 })
    await advanceRealClock(page, 1)
    await waitForDecision(page)
    await resolveCurrentDecision(page)

    progress('A3 hotfix: reward open preserves critical and skips normal gap')
    await resetState(page, 1)
    await advanceRealClock(page, 91_000)
    await openReward(page)
    await emitCrisis(page, 'economic')
    await page.waitForTimeout(100)
    assert(await page.locator('.ref-decision-overlay').count() === 0, 'critical decision must not overlay reward modal')
    await closeReward(page)
    await waitForDecision(page)
    snap = await bridgeSnapshot(page)
    assert(snap.seriousShown === 0, 'critical decision after reward must not consume normal session count', snap)
    pacing = await pacingSnapshot(page)
    assert(pacing.seriousEventKeys.length === 0 && pacing.nextSeriousDecisionDay === null, 'critical decision after reward must not consume serious cooldown history', pacing)

    progress('A3 hotfix: cleanup')
  } finally {
    if (context) await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
  console.log('TUR15-A3 hotfix checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
