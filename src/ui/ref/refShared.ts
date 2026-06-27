import { assetUrl } from '../../utils/assetUrl'
import { formatMoney } from '../../game/Economy'
import { i18n } from '../../i18n'

/** Base-path uyumlu asset yolu (baştaki / opsiyonel). */
export function ua(p: string): string {
  return assetUrl(p.startsWith('/') ? p.slice(1) : p)
}

/**
 * ₺ kısaltmalı para formatı.
 * TEK KAYNAK: eski oyunun formatMoney'sini birebir kullanır; RefApp'te görünen
 * tüm para değerleri eski UI/ShopPanel ile aynı sayıyı (aynı ondalık/kısaltma)
 * gösterir. Sadece başına ₺ önekini ekler.
 */
export function fmtMoney(n: number): string {
  const neg = n < 0 ? '-' : ''
  return `${neg}₺${formatMoney(Math.abs(n))}`
}

/** Tam sayı tutarlarda gereksiz `.0` göstermez (ör. ₺1.0 → ₺1, ₺3.0K → ₺3K). */
export function fmtMoneyTrim(n: number): string {
  return fmtMoney(n).replace(/\.0(?=[KMBT]?$)/, '')
}

/**
 * TUR14 (kalan iş) — Locale-aware imzalı "günlük tutar" (ör. −₺587/gün).
 * İşaret + para tek bir LTR `<bdi>` içinde izole edilir → Arapça/RTL'de sayı ve
 * para işareti dağılmaz ("g/587-₺" gibi bozulma olmaz); gün eki aktif dilde gelir.
 * Eksi işareti U+2212 (gerçek eksi), gereksiz `.0` yok, pozitifte `+`.
 */
export function formatSignedMoneyPerDay(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  const money = fmtMoneyTrim(Math.abs(amount))
  const unit = i18n.t('time_day')
  return `<bdi dir="ltr">${sign}${money}</bdi>/${unit}`
}

/** Yıldız satırı HTML'i. */
export function starsHtml(count: number, max = 5): string {
  return Array.from({ length: max }, (_, i) =>
    `<span class="${i < count ? 'on' : 'off'}">★</span>`
  ).join('')
}

/** Kısa süreli bildirim (satın alma başarı/başarısızlık geri bildirimi). */
let refToastEl: HTMLElement | null = null
let refToastTimer: number | null = null
export function refToast(message: string, kind: 'ok' | 'err' = 'ok'): void {
  if (!refToastEl) {
    refToastEl = document.createElement('div')
    refToastEl.className = 'ref-toast'
    document.body.appendChild(refToastEl)
  }
  refToastEl.textContent = message
  refToastEl.classList.remove('ok', 'err', 'show')
  void refToastEl.offsetWidth   // reflow → animasyon yeniden tetiklensin
  refToastEl.classList.add(kind, 'show')
  if (refToastTimer !== null) window.clearTimeout(refToastTimer)
  refToastTimer = window.setTimeout(() => {
    refToastEl?.classList.remove('show')
  }, 1800)
}

/**
 * TUR14 — Bottom-sheet/dialog panelleri için ortak dismiss davranışı: açılışta
 * arka sayfa scroll'unu kilitler + ESC tuşuyla kapanışı bağlar. Dönen temizleyici
 * panel kapanırken çağrılmalı (scroll geri açılır, listener kalkar).
 */
export function registerSheetDismiss(close: () => void): () => void {
  document.body.classList.add('ref-sheet-open')
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', onKey)
  return () => {
    document.removeEventListener('keydown', onKey)
    document.body.classList.remove('ref-sheet-open')
  }
}

/** Header'dan açılan sayfalar için "‹ Geri" satırı (RefAchievementsPage deseni). */
export function backRow(onBack: () => void, rightText?: string): HTMLElement {
  const top = document.createElement('div')
  top.className = 'ref-ach-top ref-page-topbar'
  top.innerHTML = `
    <button class="ref-back-btn" type="button">${i18n.t('ref_back')}</button>
    ${rightText ? `<span class="ref-ach-count">${rightText}</span>` : ''}
  `
  top.querySelector('.ref-back-btn')!.addEventListener('click', onBack)
  return top
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
  el.innerHTML = `<span>🧪</span><span><b>${i18n.t('ref_demo_banner_prefix')}</b> ${text}</span>`
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

/** Yarım daire gauge (0-100). Temiz, simetrik semicircle. */
export function gaugeSvg(pct: number, color = '#28C76F', w = 160, h = 96): string {
  const p = Math.min(100, Math.max(0, pct))
  const r = 60
  const cx = w / 2
  const cy = h - 14
  const a = Math.PI * (1 - p / 100)
  const x = cx + r * Math.cos(a)
  const y = cy - r * Math.sin(a)
  // Yarım daire yayı her zaman ≤180° → large-arc-flag SABİT 0.
  // (Eski kod pct>50'de 1 yapıyordu; yay uzun yoldan dönüp şekli bozuyordu.)
  return `<svg viewBox="0 0 ${w} ${h}" class="ref-gauge-svg">
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="rgba(18,58,82,0.10)" stroke-width="12" stroke-linecap="round"/>
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
    <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="24" font-weight="900" fill="#123A52">${Math.round(p)}%</text>
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
