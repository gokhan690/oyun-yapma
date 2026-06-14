import type { GameState } from '../../game/GameState'
import { PRODUCERS, producerName, type ProducerDef } from '../../game/Economy'
import { reputationLabel } from '../../game/Reputation'
import { cityDef, type CityId } from '../../game/ExpansionMap'
import type { FirmData, FirmSector, FirmStatus } from './RefCard'
import { fameLevelLabel, FAME_CAREERS } from '../../game/Fame'
import type { DiseaseId } from '../../game/Diseases'
import { diseaseDef } from '../../game/Diseases'
import { PLAYER_RANKS, rankProgress } from '../../game/PlayerRank'

/*
 * RefAppDataAdapter — SALT OKUNUR. GÜVENLİK DENETİMİ:
 * ─────────────────────────────────────────────────────
 * ✅ GameState'e HİÇBİR yazma yapılmaz (state.money, state.producers vb. değiştirilmez)
 * ✅ Hiçbir aksiyon tetiklenmez (satın alma, yükseltme, IPO, dynasty vb.)
 * ✅ Tüm side-effect'ler (event dispatch, DOM mutation, timeout) yoktur
 * ✅ Sadece okuma: state.*() metodlar, state.money, state.producers, state.cities, state.reputation
 * ✅ Eksik/ölçülemeyen alanlarda deterministik fallback üretilir; UI bozulmaz
 * ─────────────────────────────────────────────────────
 * GameState'ten okuyup RefApp componentlerinin beklediği view-model'e çevirir.
 * Componentler GameState görmez; yalnızca bu view-model'i alır.
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

export interface RefDiseaseVM {
  id: DiseaseId
  name: string
  emoji: string
  treatCost: number
  dailyDamage: number
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
  // Extended fields (health / fame / karma)
  health: number
  healthLabel: string
  diseases: RefDiseaseVM[]
  fame: number
  fameLabel: string
  fameCareerName: string | null
  fameCareerType: string | null
  fameIsActive: boolean
  karma: number
  siblingCount: number
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

// Deterministik hash (id → 0..n) — sadece küçük variance için, ana değer her zaman mantıksal türetme
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/* ── Producer → Görsel Kategori Eşlemesi (3 katmanlı) ──────────────────────
 *
 * Katman 1 (en yüksek öncelik): Açık ID→kategori haritası.
 *   Bilinen producer'lar için doğru kategoriyi garanti eder;
 *   ProducerDef.category yanlış/eksik olsa bile çalışır.
 *
 * Katman 2: ProducerDef.category alanı (genel kural).
 *   Yeni producer'lar için yeterli; ID haritasında yoksa buraya düşer.
 *
 * Katman 3 (güvenli varsayılan): 'ecommerce' (en nötr görsel).
 *   Hash-tabanlı rastgele dağılım KALDIRILDI — tahmin edilemez eşleme kötü UX.
 * ──────────────────────────────────────────────────────────────────────── */

// Katman 1: bilinen producer ID → asset kategori
const ID_CATEGORY: Record<string, string> = {
  stajyer: 'barber',      robot: 'software',    kafe: 'coffee',
  ofis: 'ecommerce',      fabrika: 'factory',   mobil_app: 'software',
  holding: 'finance',     uzay: 'software',     enerji: 'energy',
  ai: 'software',         tuzaq: 'illegal',     uydu: 'software',
  merkezbankasi: 'finance', galaksiyum: 'software', kripto: 'finance',
  nano: 'software',       bahis: 'illegal',     piramit: 'illegal',
  offshore: 'illegal',    data_center: 'software', drone: 'software',
  otel: 'hotel',          medya: 'media',       streaming: 'media',
  ilac: 'health',         sigorta: 'finance',   ev_araba: 'factory',
  restoran: 'coffee',     guzellik: 'barber',   spor_okulu: 'media',
  mini_market: 'retail',  tatil_koyu: 'hotel',  fitness_app: 'software',
  e_ticaret_loj: 'logistics', online_egitim: 'software', biyoteknoloji: 'health',
}

/** Producer → asset kategori (iş türü). Görsel sadece buradan seçilir.
 *  İllegal override → ID haritası → ProducerDef.category → 'ecommerce' */
function producerCategory(p: ProducerDef): string {
  // Illegal her zaman önce
  if (p.illegal || p.category === 'dark') return 'illegal'

  // Katman 1: açık ID haritası
  if (ID_CATEGORY[p.id]) return ID_CATEGORY[p.id]

  // Katman 2: ProducerDef.category alanı — yalnızca geçerli ProducerCategory değerleri
  // ('dark' illegal check'te yakalandı; diğer değerler aşağıda)
  switch (p.category) {
    case 'finance':  return 'finance'
    case 'science':  return 'software'
    case 'luxury':   return 'hotel'
    case 'sport':
    case 'politics': return 'media'
  }

  // Katman 3: güvenli varsayılan — hash-tabanlı rastgele DAHİL DEĞİL
  return 'ecommerce'
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
    case 'health': return 'teknoloji'   // sağlık/biyoteknoloji → teknoloji filtresi
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
  // Tier'dan deterministik: Tier 1-4→1 yıldız, 5-8→2, 9-12→3, 13-16→4, 17+→5
  return Math.max(1, Math.min(5, Math.ceil(tier / 4)))
}

/* ── Firma performans & büyüme türetme ─────────────────────────────────────
 *
 * Gerçek gider/müşteri/memnuniyet verisi GameState'te mevcut değil.
 * Aşağıdaki formüller mantıksal türetme kullanır (hash sadece küçük variance):
 *
 * PERFORMANS (50–95):
 *   Temel: 55 + sahip olunan birim sayısına göre optimizasyon bonusu.
 *   Mantık: daha fazla birim → daha çok deneyim → daha iyi performans.
 *   Yasadışı firmalar: 35–75 arası (risk premium, düşük tavan).
 *
 * BÜYÜME (%):
 *   Kategori bazlı taban (software/ecommerce en hızlı, barber/bakery en yavaş).
 *   + tier bonusu (0.3%/tier) + hash variance (±1-2%).
 *   Yasadışı: yüksek taban ama geniş variance.
 * ──────────────────────────────────────────────────────────────────────── */

// Kategori bazlı büyüme tabanı (%)
const CATEGORY_GROWTH: Record<string, number> = {
  software: 13, ecommerce: 11, energy: 10, media: 9, finance: 9,
  health: 8,   factory: 8,   hotel: 8,   logistics: 7, coffee: 7,
  restaurant: 6, bakery: 6,  retail: 6,  barber: 5,   illegal: 12,
}

function derivePerformance(count: number, isIllegal: boolean, h: number): number {
  // count = sahip olunan birim sayısı; her 3 birim +1 puan (max 35 puan)
  const countBonus = Math.min(35, count * 3)
  const smallVariance = h % 8   // 0-7 arası küçük varyasyon
  return isIllegal
    ? Math.max(35, Math.min(75, 45 + countBonus + smallVariance))
    : Math.max(50, Math.min(95, 55 + countBonus + smallVariance))
}

function deriveGrowth(cat: string, tier: number, isIllegal: boolean, h: number): number {
  const base = CATEGORY_GROWTH[cat] ?? 6
  const tierBonus = tier * 0.3
  // variance: yasadışı daha geniş (0-5.9), yasal daha dar (0-2.9)
  const variance = isIllegal ? (h % 60) / 10 : (h % 30) / 10
  return +((base + tierBonus + variance).toFixed(1))
}

/** Sahip olunan producer → firma view-model (FirmData). */
function producerToFirm(state: GameState, p: ProducerDef, ownedCities: CityId[]): FirmData {
  const count = state.producers[p.id] ?? 0
  const income = Math.round(state.producerIncome(p))
  // estimatedExpense: gerçek gider verisi GameState'te yok; income × 0.32 yaklaşık tahmin.
  // Gerçek gider sistemi eklendikçe burası state.producerExpense(p) ile değiştirilecek.
  const expense = Math.round(income * 0.32)
  const h = hash(p.id)
  const cat = producerCategory(p)
  const isIllegal = cat === 'illegal'
  const sector = categorySector(cat)
  const cityId = ownedCities.length ? ownedCities[h % ownedCities.length] : 'istanbul'
  const status: FirmStatus = isIllegal ? 'Riskli' : income > expense * 1.6 ? 'Karlı' : 'Büyüyor'

  const performance = derivePerformance(count, isIllegal, h)
  const growth = deriveGrowth(cat, p.tier, isIllegal, h)

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
    expense,                              // estimatedExpense (bkz. yukarıdaki yorum)
    growth,
    city: cityDef(cityId).label,
    performance,
    riskLevel: isIllegal ? 55 + (h % 40) : undefined,
  }
}

const MILESTONES = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]

/** Net değer trendi (10 nokta) — GERÇEK netWorth'ten türetilir.
 *  GameState geçmiş tutmadığından bu TAHMİNİ bir eğridir: bugünden geriye
 *  kademeli (~%4-7) azaltarak yükselen bir seri üretir. Deterministik;
 *  her oyuncu için kendi servetine göre farklı şekil çıkar. UI 'tahmini' etiketler. */
function deriveNetWorthTrend(netWorth: number): number[] {
  if (netWorth <= 0) return [2, 3, 3, 4, 5, 5, 6, 7, 8, 10]
  const pts: number[] = []
  let v = netWorth
  for (let i = 0; i < 10; i++) {
    pts.unshift(Math.max(1, Math.round(v)))
    const decay = 1 + 0.04 + (hash(String(i + 1)) % 30) / 1000   // ~%4-7 geriye azalış
    v = v / decay
  }
  return pts
}

const RANKS = [
  { min: 0,               title: 'Çırak Girişimci' },
  { min: 10_000,          title: 'Esnaf' },
  { min: 1_000_000,       title: 'İşletme Sahibi' },
  { min: 100_000_000,     title: 'Holding Başkanı' },
  { min: 1_000_000_000,   title: 'Sektör Lideri' },
]

function rankFor(netWorth: number): { idx: number; title: string; next: string; nextMin: number } {
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) if (netWorth >= RANKS[i].min) idx = i
  const next = RANKS[Math.min(idx + 1, RANKS.length - 1)]
  return { idx, title: RANKS[idx].title, next: next.title, nextMin: next.min }
}

/** Hafif: yalnızca header player alanını hesaplar (firma/kariyer build'i yok). */
export function playerVMFromState(state: GameState): RefPlayerVM {
  const netWorth = Math.round(state.financeNetWorth())
  const rank = rankFor(netWorth)
  return {
    name: state.playerName || 'Baron',
    title: rank.title,
    age: state.playerAge(),
    city: cityDef(state.cities.activeCity).label,
    avatarAsset: AVATAR,
  }
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
      ico: '💎',
      name: `₺${nextMs >= 1e6 ? (nextMs / 1e6) + 'M' : nextMs >= 1e3 ? (nextMs / 1e3) + 'K' : nextMs} Servet`,
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

  // dailyExpense: gerçek gider yok; tüm firmaların estimatedExpense toplamı kullanılır.
  // Bu değer income × 0.32 mantığından türer (producerToFirm ile tutarlı).
  const dailyExpense = Math.round(dailyIncome * 0.32)

  const dashboard: RefDashboardVM = {
    netWorth,
    cash: Math.round(state.money),
    dailyIncome,
    dailyExpense,
    reputation: Math.round(state.reputation),
    reputationLabel: reputationLabel(state.reputation),
    firmCount: state.ownedBusinessTiers(),
    cityCount: ownedCities.length,
    incomeSources: incomeSources.length ? incomeSources : dailyIncome > 0 ? [{ label: 'Kariyer Geliri', value: 100, color: '#2563EB' }] : [{ label: 'Henüz yok', value: 100, color: '#94B4C2' }],
    netWorthTrend: deriveNetWorthTrend(netWorth),   // gerçek netWorth'ten türetilmiş tahmini eğri
    goals,
  }

  const fameState = (state as unknown as { fameState?: { careerType: string | null; fameLevel: number; isActive: boolean } }).fameState
  const diseases = (state as unknown as { diseases?: { id: DiseaseId; diagnosedDay: number }[] }).diseases ?? []
  const siblings = (state as unknown as { siblings?: { isAlive: boolean }[] }).siblings ?? []
  const karma = (state as unknown as { karma?: number }).karma ?? 0
  const health = Math.round(state.health?.health ?? 100)
  const healthLabel = health >= 80 ? 'İyi' : health >= 50 ? 'Orta' : health >= 20 ? 'Kötü' : 'Kritik'

  const diseaseVMs: RefDiseaseVM[] = diseases.map((d) => {
    const def = diseaseDef(d.id)
    return { id: d.id, name: def.name, emoji: def.emoji, treatCost: def.treatCost, dailyDamage: def.dailyHealthDamage }
  })

  const fameCareerDef = fameState?.careerType
    ? FAME_CAREERS.find((c) => c.id === fameState.careerType)
    : null

  // Gerçek kariyer basamağı: PlayerRank (totalEarned tabanlı 10 kademe) — TEK KAYNAK
  const rp = rankProgress(state.totalEarned)
  const career: RefCareerVM = {
    jobTitle: `${rp.current.emoji} ${rp.current.name}`,
    level: PLAYER_RANKS.indexOf(rp.current) + 1,
    salaryDaily: dailyIncome,
    stress: Math.round(state.lifestyle.stress),
    xpPct: Math.round(rp.pct),
    xpText: `₺${fmt(Math.round(state.totalEarned))} / ${rp.next ? '₺' + fmt(rp.next.minEarned) : 'ZİRVE'}`,
    nextRank: rp.next ? `${rp.next.emoji} ${rp.next.name}` : '🏆 Zirvede',
    seniorityYears: Math.max(0, age - 18),
    health,
    healthLabel,
    diseases: diseaseVMs,
    fame: Math.round(fameState?.fameLevel ?? 0),
    fameLabel: fameLevelLabel(fameState?.fameLevel ?? 0),
    fameCareerName: fameCareerDef?.name ?? null,
    fameCareerType: fameState?.careerType ?? null,
    fameIsActive: fameState?.isActive ?? false,
    karma,
    siblingCount: siblings.filter((s) => s.isAlive).length,
  }

  const player: RefPlayerVM = {
    name: state.playerName || 'Baron',
    title: rank.title,
    age,
    city: cityDef(state.cities.activeCity).label,
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
