import { assetUrl } from '../../utils/assetUrl'

/** Base-path uyumlu asset yolu (baştaki / opsiyonel). */
export function ua(p: string): string {
  return assetUrl(p.startsWith('/') ? p.slice(1) : p)
}

/** ₺ kısaltmalı para formatı. */
export function fmtMoney(n: number): string {
  const neg = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e9) return `${neg}₺${(a / 1e9).toFixed(1)}Mr`
  if (a >= 1e6) return `${neg}₺${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${neg}₺${(a / 1e3).toFixed(0)}K`
  return `${neg}₺${a}`
}

/** Yıldız satırı HTML'i. */
export function starsHtml(count: number, max = 5): string {
  return Array.from({ length: max }, (_, i) =>
    `<span class="${i < count ? 'on' : 'off'}">★</span>`
  ).join('')
}

/** Bölüm başlığı satırı oluşturur (opsiyonel "tümü" linki). */
export function sectionTitle(text: string, action?: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'ref-sec-title'
  el.innerHTML = `<span>${text}</span>${action ? `<span class="ref-sec-action">${action}</span>` : ''}`
  return el
}
