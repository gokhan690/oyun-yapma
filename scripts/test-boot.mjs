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
await page.waitForTimeout(2000)

const appEmpty = await page.evaluate(() => {
  const app = document.querySelector('#app')
  return !app || app.children.length === 0
})
const bootError = await page.evaluate(() => document.querySelector('#boot-error')?.textContent || '')
const appHtml = await page.evaluate(() => document.querySelector('#app')?.innerHTML?.slice(0, 200) || '')

console.log('URL:', url)
console.log('appEmpty:', appEmpty)
console.log('bootError:', bootError)
console.log('appPreview:', appHtml)
console.log('errors:', errors)

await browser.close()
process.exit(appEmpty && !bootError ? 1 : 0)
