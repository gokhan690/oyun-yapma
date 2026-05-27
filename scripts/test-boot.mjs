import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const fresh = process.argv.includes('--fresh')
const browser = await chromium.launch()
const context = await browser.newContext()
if (fresh) {
  await context.addInitScript(() => {
    const keep = ['baron_setup_done']
    localStorage.clear()
    sessionStorage.clear()
    for (const key of keep) localStorage.setItem(key, '1')
  })
}
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)

const checks = await page.evaluate(() => {
  const app = document.querySelector('#app')
  const bootError = document.querySelector('#boot-error')?.textContent || ''
  const hasHud = !!document.querySelector('.bottom-nav') || !!document.querySelector('.tap-area')
  const title = document.querySelector('h1')?.textContent || ''
  const modalOpen = !!document.querySelector('.modal-layer.is-open .game-modal')
  const tutorialOpen = !!document.querySelector('.tutorial-overlay')
  const clock = document.querySelector('.day-night-chip')?.textContent || ''
  return {
    appEmpty: !app || app.children.length === 0,
    bootError,
    hasHud,
    title,
    modalOpen,
    tutorialOpen,
    clock,
    appPreview: app?.innerHTML?.slice(0, 200) || '',
  }
})

if (checks.modalOpen && checks.tutorialOpen) {
  errors.push('Tutorial and modal are open at the same time on boot')
}

if (fresh) {
  const initialClock = checks.clock
  const tap = page.locator('.tap-area')
  if (await tap.count() !== 1) {
    errors.push('Tap area missing on fresh boot')
  } else {
    for (let i = 0; i < 12; i++) await tap.click({ timeout: 3000 })
  }

  const shopNav = page.locator('[data-action="nav-view"][data-id="shop"]')
  if (await shopNav.count() !== 1) {
    errors.push('Shop nav missing on fresh boot')
  } else {
    await shopNav.click({ timeout: 3000 })
    await page.waitForTimeout(400)
  }

  const starterBuy = page.locator('[data-action="buy-business"][data-id="stajyer"]')
  if (await starterBuy.count() !== 1) {
    errors.push('Starter business buy button missing')
  } else if (!(await starterBuy.isEnabled())) {
    errors.push('Starter business is not affordable after 12 taps')
  } else {
    await starterBuy.click({ timeout: 3000 })
    await page.waitForTimeout(800)
  }

  const afterFresh = await page.evaluate(() => {
    const card = document.querySelector('.biz-card[data-producer-id="stajyer"], .biz-hero-card[data-producer-id="stajyer"]')
    return {
      owned: card?.querySelector('.biz-owned, .biz-hero-owned-badge')?.textContent || '',
      modalOpen: !!document.querySelector('.modal-layer.is-open .game-modal'),
      tutorialOpen: !!document.querySelector('.tutorial-overlay'),
      clock: document.querySelector('.day-night-chip')?.textContent || '',
    }
  })
  if (!/[1-9]/.test(afterFresh.owned)) errors.push(`Starter business was not purchased: ${afterFresh.owned}`)
  if (afterFresh.modalOpen && afterFresh.tutorialOpen) errors.push('Tutorial and modal overlap after first purchase')
  if (initialClock && afterFresh.clock && initialClock !== afterFresh.clock) {
    errors.push(`Clock advanced during mandatory tutorial: "${initialClock}" -> "${afterFresh.clock}"`)
  }
}

console.log('URL:', url)
console.log('appEmpty:', checks.appEmpty)
console.log('bootError:', checks.bootError)
console.log('hasHud:', checks.hasHud)
console.log('title:', checks.title)
console.log('modalOpen:', checks.modalOpen)
console.log('tutorialOpen:', checks.tutorialOpen)
console.log('clock:', checks.clock)
console.log('appPreview:', checks.appPreview)
console.log('errors:', errors)

const ok = !checks.appEmpty && !checks.bootError && checks.hasHud && errors.length === 0
await browser.close()
process.exit(ok ? 0 : 1)
