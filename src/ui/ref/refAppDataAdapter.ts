import type { GameState } from '../../game/GameState'
import { PRODUCERS, producerName, type ProducerDef } from '../../game/Economy'
import { reputationLabel } from '../../game/Reputation'
import { cityDef, type CityId } from '../../game/ExpansionMap'
import type { FirmData, FirmSector, FirmStatus } from './RefCard'

/*
 * RefAppDataAdapter — SALT OKUNUR.
 * GameState'ten okuyup RefApp componentlerinin beklediği view-model'e çevirir.
 * GameState'e YAZMAZ; hiçbir aksiyon tetiklemez. Eksik/ölçülemeyen alanlarda
 * deterministik fallback üretir (UI bozulmasın). Componentler GameState
 * görmez; yalnızca bu view-model'i alır.
 *
 * Asset kuralı: firma adı (name) DİNAMİK gelir, görsele gömülü değildir.
 * Görsel SADECE category (iş türü) üzerinden seçilir (RefCard.firmIconSrc).
 */

/* ── View-model tipleri ── */
export interface RefPlayerVM {
  name: string
  title: string
  age: number
  city: string
  avatarAsset: string
}

export interface RefIncomeSource { label: string; value: number; color: string }
export interface RefGoalVM { ico: string; name: string; pct: number; metaA: string }

export interface RefDashboardVM {
  netWorth: number
  cash: number
  dailyIncome: number
  dailyExpense: number
  reputation: number
  reputationLabel: string
  firmCount: number
  cityCount: number
  incomeSources: RefIncomeSource[]
  netWorthTrend: number[]
  goals: RefGoalVM[]
}

export interface RefCareerVM {
  jobTitle: string
  level: number
  salaryDaily: number
  stress: number
  xpPct: number
  xpText: string
  nextRank: string
  seniorityYears: number
}

export interface RefViewModel {
  source: 'real'
  player: RefPlayerVM
  dashboard: RefDashboardVM
  firms: FirmData[]
  career: RefCareerVM
}

/* ── Yardımcılar ── */

const AVATAR = '/assets/ref-v2/avatars/avatar_main_businessman.png'

// Deterministik hash (id → 0..n)
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// Genel producer'lar için (kategorisi olmayanlar) hero'su olan kategoriler.
const GENERAL_POOL = ['bakery', 'coffee', 'barber', 'ecommerce', 'logistics']

// Bilinen producer id → asset kategori (ad/görsel tutarlılığı için açık eşleme).
const ID_CATEGORY: Record<string, string> = {
  stajyer: 'barber', robot: 'software', kafe: 'coffee', ofis: 'ecommerce',
  fabrika: 'factory', mobil_app: 'software', holding: 'finance', uzay: 'software',
  enerji: 'energy', ai: 'software', tuzaq: 'illegal', uydu: 'software',
  merkezbankasi: 'finance', galaksiyum: 'software', kripto: 'finance', nano: 'software',
  bahis: 'illegal', piramit: 'illegal', offshore: 'illegal', data_center: 'software',
  drone: 'software', otel: 'hotel', medya: 'media', streaming: 'media',
  ilac: 'health', sigorta: 'finance', ev_araba: 'factory',
}

/** Producer → asset kategori (iş türü). Görsel sadece buradan seçilir. */
function producerCategory(p: ProducerDef): string {
  if (ID_CATEGORY[p.id]) return ID_CATEGORY[p.id]
  if (p.illegal || p.category === 'dark') return 'illegal'
  if (p.category === 'finance') return 'finance'
  if (p.category === 'science') return 'software'
  if (p.category === 'luxury') return 'hotel'
  if (p.category === 'sport' || p.category === 'politics') return 'media'
  return GENERAL_POOL[hash(p.id) % GENERAL_POOL.length]
}

/** Asset kategori → filtre sektörü. */
function categorySector(cat: string): FirmSector {
  switch (cat) {
    case 'bakery': case 'coffee': case 'restaurant': return 'gida'
    case 'barber': case 'logistics': case 'retail': return 'hizmet'
    case 'hotel': return 'turizm'
    case 'ecommerce': case 'software': case 'factory': case 'energy': return 'teknoloji'
    case 'finance': return 'finans'
    case 'media': return 'medya'
    case 'illegal': return 'illegal'
    default: return 'hizmet'
  }
}

const SECTOR_LABEL: Record<FirmSector, string> = {
  gida: 'Gıda', hizmet: 'Hizmet', teknoloji: 'Teknoloji',
  finans: 'Finans', turizm: 'Turizm', medya: 'Medya', illegal: 'Yasadışı',
}
const SECTOR_COLOR: Record<FirmSector, string> = {
  gida: '#F6A609', hizmet: '#7C3AED', teknoloji: '#13B8A6',
  finans: '#16A34A', turizm: '#F97316', medya: '#EC4899', illegal: '#EA5455',
}

function stars(tier: number): number {
  return Math.max(1, Math.min(5, Math.ceil(tier / 4)))
}

/** Sahip olunan producer → firma view-model (FirmData). */
function producerToFirm(state: GameState, p: ProducerDef, ownedCities: CityId[]): FirmData {
  const count = state.producers[p.id] ?? 0
  const income = Math.round(state.producerIncome(p))
  const expense = Math.round(income * 0.32)                 // fallback (gerçek gider yok)
  const h = hash(p.id)
  const growth = +(5 + (h % 130) / 10).toFixed(1)           // fallback 5.0–17.9
  const performance = 52 + (h % 44)                          // fallback 52–95
  const cat = producerCategory(p)
  const sector = categorySector(cat)
  const cityId = ownedCities.length ? ownedCities[h % ownedCities.length] : 'istanbul'
  const status: FirmStatus = p.illegal ? 'Riskli' : income > expense * 1.6 ? 'Karlı' : 'Büyüyor'

  return {
    id: p.id,
    name: producerName(p),               // DİNAMİK — asset'e gömülü değil
    slogan: undefined,
    category: cat,                        // görsel buradan
    sector,
    emoji: p.emoji,
    level: Math.max(1, count),
    stars: stars(p.tier),
    status,
    income,
    expense,
    growth,
    city: cityDef(cityId).label,
    performance,
    riskLevel: p.illegal ? 55 + (h % 40) : undefined,
  }
}

const NETWORTH_TREND_FALLBACK = [82, 85, 84, 88, 90, 92, 95, 94, 97, 100]
const MILESTONES = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]

/** Net worth tier'ından unvan üret (fallback). */
const RANKS = [
  { min: 0,         title: 'Çırak Girişimci' },
  { min: 10_000,    title: 'Esnaf' },
  { min: 1_000_000, title: 'İşletme Sahibi' },
  { min: 100_000_000, title: 'Holding Başkanı' },
  { min: 1_000_000_000, title: 'Sektör Lideri' },
]
function rankFor(netWorth: number): { idx: number; title: string; next: string; nextMin: number } {
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) if (netWorth >= RANKS[i].min) idx = i
  const next = RANKS[Math.min(idx + 1, RANKS.length - 1)]
  return { idx, title: RANKS[idx].title, next: next.title, nextMin: next.min }
}

/* ── Ana giriş ── */
export function buildRefViewModel(state: GameState): RefViewModel {
  const netWorth = Math.round(state.financeNetWorth())
  const dailyIncome = Math.round(state.incomePerDay())
  const ownedCities = state.cities.unlocked
  const rank = rankFor(netWorth)
  const age = state.playerAge()

  // Sahip olunan firmalar (count > 0)
  const owned = PRODUCERS.filter((p) => (state.producers[p.id] ?? 0) > 0)
  const firms = owned.map((p) => producerToFirm(state, p, ownedCities))

  // Gelir kaynakları (sektöre göre, gerçek)
  const bySector = new Map<FirmSector, number>()
  for (const f of firms) {
    const s = (f.sector ?? 'hizmet') as FirmSector
    bySector.set(s, (bySector.get(s) ?? 0) + f.income)
  }
  const totalSector = Array.from(bySector.values()).reduce((a, b) => a + b, 0) || 1
  const incomeSources: RefIncomeSource[] = Array.from(bySector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sec, val]) => ({
      label: SECTOR_LABEL[sec],
      value: Math.round((val / totalSector) * 100),
      color: SECTOR_COLOR[sec],
    }))

  // Hedefler — bir sonraki servet milestone'u (gerçek ilerleme)
  const goals: RefGoalVM[] = []
  const nextMs = MILESTONES.find((m) => netWorth < m)
  if (nextMs) {
    goals.push({
      ico: '💎', name: `₺${(nextMs / 1e6 >= 1 ? (nextMs / 1e6) + 'M' : nextMs / 1e3 + 'K')} Servet`,
      pct: Math.min(100, Math.round((netWorth / nextMs) * 100)),
      metaA: `₺${fmt(netWorth)} / ₺${fmt(nextMs)}`,
    })
  }
  if (ownedCities.length < 5) {
    goals.push({
      ico: '🏙️', name: 'Yeni Şehir Aç',
      pct: Math.min(100, Math.round((ownedCities.length / 5) * 100)),
      metaA: `${ownedCities.length} / 5 şehir`,
    })
  }

  const dashboard: RefDashboardVM = {
    netWorth,
    cash: Math.round(state.money),
    dailyIncome,
    dailyExpense: Math.round(dailyIncome * 0.3),    // fallback
    reputation: Math.round(state.reputation),
    reputationLabel: reputationLabel(state.reputation),
    firmCount: state.ownedBusinessTiers(),
    cityCount: ownedCities.length,
    incomeSources: incomeSources.length ? incomeSources : [{ label: 'Henüz yok', value: 100, color: '#94B4C2' }],
    netWorthTrend: NETWORTH_TREND_FALLBACK,          // fallback (geçmiş yok)
    goals,
  }

  const career: RefCareerVM = {
    jobTitle: rank.title,
    level: rank.idx * 6 + Math.min(6, ownedCities.length + state.ipoCount),  // fallback türetme
    salaryDaily: dailyIncome,                        // gerçek günlük gelir
    stress: Math.round(state.lifestyle.stress),      // GERÇEK
    xpPct: rank.nextMin > 0 ? Math.min(100, Math.round((netWorth / rank.nextMin) * 100)) : 100,
    xpText: `₺${fmt(netWorth)} / ₺${fmt(rank.nextMin)}`,
    nextRank: rank.next,
    seniorityYears: Math.max(0, age - 18),           // gerçek yaş türevli
  }

  const player: RefPlayerVM = {
    name: state.playerName || 'Baron',               // GERÇEK
    title: rank.title,
    age,                                             // GERÇEK
    city: cityDef(state.cities.activeCity).label,    // GERÇEK
    avatarAsset: AVATAR,
  }

  return { source: 'real', player, dashboard, firms, career }
}

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'Mr'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(Math.round(n))
}
