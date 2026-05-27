import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const browser = await chromium.launch()
const page = await browser.newPage()
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
  return {
    appEmpty: !app || app.children.length === 0,
    bootError,
    hasHud,
    title,
    appPreview: app?.innerHTML?.slice(0, 200) || '',
  }
})

console.log('URL:', url)
console.log('appEmpty:', checks.appEmpty)
console.log('bootError:', checks.bootError)
console.log('hasHud:', checks.hasHud)
console.log('title:', checks.title)
console.log('appPreview:', checks.appPreview)
console.log('errors:', errors)

const ok = !checks.appEmpty && !checks.bootError && checks.hasHud && errors.length === 0
await browser.close()
process.exit(ok ? 0 : 1)
