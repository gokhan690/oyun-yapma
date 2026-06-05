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

/** Tam-örnek (henüz GameState'e bağlı olmayan) ekranlar için demo şeridi.
 *  Bu ekranlar yalnızca görsel önizlemedir; hiçbir gerçek oyun verisi/işlemi yoktur. */
export function demoBanner(text: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'ref-demo-banner'
  el.innerHTML = `<span>🧪</span><span><b>Demo veri</b> — ${text}</span>`
  return el
}

/* ───────── Mini SVG grafik yardımcıları (static mock görsel) ───────── */

/** Alan/çizgi grafiği (0-1 normalize değerler). */
export function areaChartSvg(values: number[], color = '#13B8A6', w = 300, h = 84): string {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const stepX = w / (values.length - 1)
  const pts = values.map((v, i) => [i * stepX, h - 6 - ((v - min) / span) * (h - 14)])
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} ${w},${h} 0,${h}`
  const id = 'g' + Math.random().toString(36).slice(2, 7)
  const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="${color}"/>`).join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="ref-area-svg" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${area}" fill="url(#${id})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`
}

/** Donut grafiği + segmentler. */
export function donutSvg(segments: { value: number; color: string }[], size = 96, stroke = 16): string {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const arcs = segments.map((s) => {
    const len = (s.value / total) * c
    const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
      stroke="${s.color}" stroke-width="${stroke}"
      stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`
    offset += len
    return arc
  }).join('')
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ref-donut-svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="${stroke}"/>
    ${arcs}
  </svg>`
}

/** Yarım daire gauge (0-100). */
export function gaugeSvg(pct: number, color = '#28C76F', w = 150, h = 86): string {
  const r = 58
  const cx = w / 2
  const cy = h - 8
  const a = Math.PI * (1 - Math.min(100, Math.max(0, pct)) / 100)
  const x = cx + r * Math.cos(a)
  const y = cy - r * Math.sin(a)
  const big = pct > 50 ? 1 : 0
  return `<svg viewBox="0 0 ${w} ${h}" class="ref-gauge-svg">
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="11" stroke-linecap="round"/>
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 ${big} 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/>
    <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="22" font-weight="900" fill="#123A52">${Math.round(pct)}%</text>
  </svg>`
}

/** Dairesel ilerleme halkası + merkez metin. */
export function ringSvg(pct: number, centerTop: string, centerSub: string, size = 116, stroke = 12, color = '#13B8A6'): string {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const len = (Math.min(100, Math.max(0, pct)) / 100) * c
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ref-ring-svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="${size / 2}" y="${size / 2 - 2}" text-anchor="middle" font-size="26" font-weight="900" fill="#123A52">${centerTop}</text>
    <text x="${size / 2}" y="${size / 2 + 16}" text-anchor="middle" font-size="10" font-weight="700" fill="#5F7F91">${centerSub}</text>
  </svg>`
}
