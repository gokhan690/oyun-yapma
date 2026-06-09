import { assetUrl } from '../../utils/assetUrl'
import {
  PRODUCERS,
  formatMoney,
  formatIncomeRate,
  isProducerUnlocked,
  producerCategory,
  scaledUnlockAt,
  type ProducerDef,
} from '../../game/Economy'
import type { GameState } from '../../game/GameState'

/** ShopPanel büyüme sekmesi: category alanı olmayan üreticiler. */
export const REF_NORMAL_PRODUCERS = PRODUCERS.filter((p) => !p.category)

/** ShopPanel imparatorluk hub: category alanı olan üreticiler. */
export const REF_EMPIRE_PRODUCERS = PRODUCERS.filter((p) => !!p.category)

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

/** Firma listesi kategori chip anahtarları (Normal İşletmeler filtresi). */
export type ProducerChipKey =
  | 'tumu' | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya'
  | 'sanayi' | 'lojistik' | 'luks' | 'illegal' | 'sport' | 'politics' | 'science'

/** Kart gradient tonu — illegal chip → riskli CSS sınıfı. */
export type ProducerVisualTone =
  | 'gida' | 'hizmet' | 'teknoloji' | 'finans' | 'turizm' | 'medya'
  | 'sanayi' | 'lojistik' | 'luks' | 'riskli' | 'sport' | 'politics' | 'science'

export const PRODUCER_CHIP_TABS: { id: ProducerChipKey; label: string; icon: string }[] = [
  { id: 'tumu', label: 'Tümü', icon: '' },
  { id: 'gida', label: 'Gıda', icon: '🍔' },
  { id: 'hizmet', label: 'Hizmet', icon: '🤝' },
  { id: 'teknoloji', label: 'Teknoloji', icon: '🚀' },
  { id: 'finans', label: 'Finans', icon: '💰' },
  { id: 'turizm', label: 'Turizm', icon: '✈️' },
  { id: 'medya', label: 'Medya', icon: '🎬' },
  { id: 'sanayi', label: 'Sanayi', icon: '🏭' },
  { id: 'lojistik', label: 'Lojistik', icon: '🚚' },
  { id: 'luks', label: 'Lüks', icon: '💎' },
  { id: 'sport', label: 'Spor', icon: '⚽' },
  { id: 'politics', label: 'Siyaset', icon: '🏛️' },
  { id: 'science', label: 'Bilim', icon: '🧪' },
  { id: 'illegal', label: 'Riskli', icon: '🚫' },
]

const GIDA_IDS = new Set(['stajyer', 'firin', 'kafe', 'ofis', 'cikolata', 'market_zincir', 'pet_shop'])
const HIZMET_IDS = new Set(['berber', 'cicekci', 'giyim', 'gym', 'temizlik', 'hukuk'])
const TEKNOLOJI_IDS = new Set([
  'robot', 'holding', 'mobil_app', 'oyun_studio', 'ai', 'nano', 'data_center',
  'biyotek', 'uzay_istasyonu', 'uydu_fab', 'havacilik', 'gen_terapi', 'superbilgisayar',
  'uzay', 'uydu', 'galaksiyum', 'kuantum', 'fuzyon', 'mars', 'asteroid', 'multiverse',
])
const FINANS_IDS = new Set([
  'kripto', 'sigorta', 'hukuk', 'merkezbankasi', 'tuzaq', 'emlak_ofis',
  'banka_ozel', 'hedge_fund', 'private_equity', 'venture_capital', 'family_office',
  'reasurans', 'borsa_araci', 'sovereign_fund',
])
const TURIZM_IDS = new Set(['otel', 'havayolu', 'adalar', 'casino_legal', 'yacht_filo', 'uzay_turizmi'])
const MEDYA_IDS = new Set(['medya', 'streaming', 'reklam_ajansi'])
const LOJISTIK_IDS = new Set(['kargo', 'liman', 'drone'])
const SANAYI_IDS = new Set([
  'fabrika', 'insaat', 'maden', 'nukleer', 'ev_araba', 'ilac', 'tarim_tek', 'enerji', 'ruzgar',
  'hastane', 'universite', 'siyah_fabrika',
])

export function chipToVisualTone(chip: Exclude<ProducerChipKey, 'tumu'>): ProducerVisualTone {
  return chip === 'illegal' ? 'riskli' : chip
}

/** ProducerDef → üst kategori chip (görsel filtre + etiket; ekonomi etkilemez). */
export function producerChipCategory(def: ProducerDef): Exclude<ProducerChipKey, 'tumu'> {
  if (def.illegal || def.category === 'dark' || producerCategory(def) === 'illegal') return 'illegal'
  if (def.category === 'sport') return 'sport'
  if (def.category === 'politics') return 'politics'
  if (def.category === 'science') return 'science'
  if (def.category === 'luxury') return 'luks'
  if (def.category === 'finance') return 'finans'
  const id = def.id
  if (FINANS_IDS.has(id)) return 'finans'
  if (GIDA_IDS.has(id)) return 'gida'
  if (HIZMET_IDS.has(id)) return 'hizmet'
  if (TEKNOLOJI_IDS.has(id)) return 'teknoloji'
  if (TURIZM_IDS.has(id)) return 'turizm'
  if (MEDYA_IDS.has(id)) return 'medya'
  if (LOJISTIK_IDS.has(id)) return 'lojistik'
  if (SANAYI_IDS.has(id)) return 'sanayi'
  if (def.name.includes('Lojistik') || def.name.includes('Kargo') || def.name.includes('Liman')) return 'lojistik'
  if (def.name.includes('Fabrika') || def.name.includes('Santral') || def.name.includes('Maden') || def.name.includes('İmalat')) return 'sanayi'
  if (def.name.includes('Yazılım') || def.name.includes('Uygulama') || def.name.includes('Teknoloji') || def.name.includes('Robot')) return 'teknoloji'
  if (def.name.includes('Kripto') || def.name.includes('Borsa') || def.name.includes('Banka') || def.name.includes('Finans')) return 'finans'
  if (def.name.includes('Futbol') || def.name.includes('Spor') || def.name.includes('Basket')) return 'sport'
  if (def.name.includes('Siyaset') || def.name.includes('Belediye') || def.name.includes('Bakan')) return 'politics'
  if (def.name.includes('Restoran') || def.name.includes('Fırın') || def.name.includes('Kahve') || def.name.includes('Market')) return 'gida'
  if (def.name.includes('Limonata') || def.name.includes('Limon') || def.name.includes('Tezgah')) return 'gida'
  if (def.name.includes('Ofis') || def.name.includes('Berber')) return 'hizmet'
  return 'hizmet'
}

export function producerChipLabel(chip: Exclude<ProducerChipKey, 'tumu'>): string {
  return PRODUCER_CHIP_TABS.find((t) => t.id === chip)?.label ?? chip
}

/** ShopPanel BuyMode ile aynı: 1 / 10 / 100 / max */
export type RefBuyMode = 1 | 10 | 100 | 'max'

export const REF_BUY_MODES: { mode: RefBuyMode; label: string }[] = [
  { mode: 1, label: '1x' },
  { mode: 10, label: '10x' },
  { mode: 100, label: '100x' },
  { mode: 'max', label: 'Max' },
]

export type ProducerCardState = 'owned' | 'available' | 'no-cash' | 'locked'

export interface ProducerCardSnap {
  state: ProducerCardState
  stateClass: string
  badge: string
  badgeCls: string
  chip: Exclude<ProducerChipKey, 'tumu'>
  owned: number
  unlocked: boolean
  cost: number
  costText: string
  canBuy: boolean
  /** Seçili moddaki toplu alım adedi (gösterim) */
  buyCount: number
  /** Satın alma tıklanınca kullanılacak adet (max → countMaxAffordable) */
  purchaseCount: number
  /** ShopPanel updateBusinessCard ile aynı: marginalProducerIncome(def, buyCount) */
  marginalIncome: number
  marginalIncomeText: string
  /** Sahip olunca toplam pasif gelir (producerIncome) */
  totalIncome: number
  totalIncomeText: string | null
  lockReason: string | null
  perfPct: number
  perfCls: 'high' | 'medium' | 'low'
  stars: number
}

/** ShopPanel kart geliri — state.marginalProducerIncome(def, count) */
export function shopPanelMarginalIncome(s: GameState, def: ProducerDef, count = 1): number {
  return s.marginalProducerIncome(def, count)
}

/** ShopPanel kart maliyeti — state.producerCostFor(def, owned, count) */
export function shopPanelProducerCost(s: GameState, def: ProducerDef, count = 1): number {
  const owned = s.producers[def.id] ?? 0
  return s.producerCostFor(def, owned, count)
}

/** ShopPanel updateBusinessCard buyCount mantığı — max için countMaxAffordable. */
export function resolveRefBuyCount(
  s: GameState,
  def: ProducerDef,
  mode: RefBuyMode,
): { affordableCount: number; buyCount: number; purchaseCount: number } {
  if (mode === 'max') {
    const affordableCount = s.countMaxAffordable(def.id)
    const buyCount = Math.max(1, affordableCount)
    return {
      affordableCount,
      buyCount,
      purchaseCount: affordableCount >= 1 ? affordableCount : 0,
    }
  }
  const buyCount = mode
  return { affordableCount: buyCount, buyCount, purchaseCount: buyCount }
}

export function producerCardSnap(def: ProducerDef, s: GameState, buyMode: RefBuyMode = 1): ProducerCardSnap {
  const owned = s.producers[def.id] ?? 0
  const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
  const { affordableCount, buyCount, purchaseCount } = resolveRefBuyCount(s, def, buyMode)
  const cost = shopPanelProducerCost(s, def, buyCount)
  const canBuy = unlocked && affordableCount >= 1 && s.canAfford(cost)
  const marginalIncome = shopPanelMarginalIncome(s, def, buyCount)
  const marginalIncomeText = buyCount > 1
    ? `+${formatIncomeRate(marginalIncome)} (${buyCount} ad.)`
    : `+${formatIncomeRate(marginalIncome)}`
  const costText = buyMode === 'max' && affordableCount > 1
    ? `${formatMoney(cost)} (${affordableCount} ad.)`
    : formatMoney(cost)
  const totalIncome = owned > 0 ? s.producerIncome(def) : 0
  const totalIncomeText = owned > 0 ? formatIncomeRate(totalIncome) : null

  let state: ProducerCardState
  let badge: string
  let badgeCls: string
  if (!unlocked) {
    state = 'locked'
    badge = 'Kilitli'
    badgeCls = 'locked'
  } else if (owned > 0) {
    state = canBuy ? 'owned' : 'no-cash'
    badge = def.illegal ? 'Riskli' : canBuy ? 'Karlı' : 'Aktif'
    badgeCls = def.illegal ? 'riskli' : canBuy ? 'karli' : 'buyuyor'
  } else if (canBuy) {
    state = 'available'
    badge = 'Alınabilir'
    badgeCls = 'buyuyor'
  } else {
    state = 'no-cash'
    badge = 'Para Yetersiz'
    badgeCls = 'riskli'
  }

  let lockReason: string | null = null
  if (!unlocked) {
    if ((def.ipoRequirement ?? 0) > s.ipoCount) {
      lockReason = `${def.ipoRequirement} IPO gerekli`
    } else {
      const need = scaledUnlockAt(def)
      lockReason = need > 0 ? `${formatMoney(need)} toplam kazanç` : 'Henüz açılmadı'
    }
  }

  let perfPct: number
  if (!unlocked) {
    const need = scaledUnlockAt(def)
    perfPct = need > 0 ? Math.min(100, Math.round((s.totalEarned / need) * 100)) : 0
  } else if (owned > 0 && totalIncome > 0) {
    perfPct = Math.min(100, Math.round((marginalIncome / totalIncome) * 100 * owned))
  } else {
    perfPct = Math.min(55, 18 + def.tier * 4)
  }
  const perfCls: 'high' | 'medium' | 'low' = perfPct >= 70 ? 'high' : perfPct >= 45 ? 'medium' : 'low'

  return {
    state,
    stateClass: state,
    badge,
    badgeCls,
    chip: producerChipCategory(def),
    owned,
    unlocked,
    cost,
    costText,
    canBuy,
    buyCount,
    purchaseCount: canBuy ? purchaseCount : 0,
    marginalIncome,
    marginalIncomeText,
    totalIncome,
    totalIncomeText,
    lockReason,
    perfPct,
    perfCls,
    stars: Math.min(5, Math.max(1, Math.ceil(def.tier / 2))),
  }
}

export function perfBarClass(pct: number): 'high' | 'medium' | 'low' {
  if (pct >= 70) return 'high'
  if (pct >= 45) return 'medium'
  return 'low'
}

/** Yıldız satırı HTML'i. */
export function starsHtml(count: number, max = 5): string {
  return Array.from({ length: max }, (_, i) =>
    `<span class="${i < count ? 'on' : 'off'}">★</span>`
  ).join('')
}

function producerHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Firma detay gelir trendi — gerçek geçmiş yok, firmaya özgü deterministik tahmin. */
export function producerDetailTrend(def: ProducerDef, growthHint = 8): number[] {
  let s = producerHash(def.id) || 1
  const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 8) / (1 << 23) }
  const slope = 0.55 + Math.min(1.4, growthHint / 12)
  const out: number[] = []
  let base = 34 + (producerHash(def.id) % 16)
  for (let i = 0; i < 14; i++) {
    base += slope + (rnd() - 0.4) * 4.5
    out.push(+Math.max(10, base).toFixed(1))
  }
  return out
}

/** Performanstan türetilmiş memnuniyet tahmini (ölçüm yok). */
export function producerDetailSatisfaction(perfPct: number): number {
  return Math.min(96, Math.max(28, perfPct + 14))
}

/**
 * localStorage'da tutulan kalıcı mod feature flag anahtarı.
 * `'1'` ise intro bitince RefApp otomatik açılır, eski HUD gizlenir.
 */
export const REFAPP_DEFAULT_FLAG = 'ii_use_refapp'

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
