import type { GameState } from '../../game/GameState'
import { PRODUCERS, producerName, type ProducerDef } from '../../game/Economy'
import { reputationLabel } from '../../game/Reputation'
import { cityDef, type CityId } from '../../game/ExpansionMap'
import { ownedBusinessCount } from '../../game/ProgressiveUnlock'
import { currentRank, rankProgress, type PlayerRankDef } from '../../game/PlayerRank'
import { hasSkill, type PlayerSkillId } from '../../game/PlayerSkills'
import { gameDay } from '../../game/GameClock'
import {
  BINDABLE_CAREER_ACTION_IDS,
  CAREER_JOBS,
  careerJobDef,
  careerWageMultiplier,
  dailyCareerWage,
  estimatedCareerActionPay,
  FIRST_GOAL_TARGET,
  type CareerActionId,
  type CareerJobId,
  type CareerState,
} from '../../game/Career'
import type { FirmData, FirmSector, FirmStatus } from './RefCard'

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

export type RefCareerPhase = 'employee' | 'entrepreneur' | 'tycoon'
export type RefTimelineStatus = 'done' | 'active' | 'locked'

export interface RefCareerActionVM {
  id: string
  ico: string
  label: string
  effect: string
  /** Master career action id (C4 binding için hazır). */
  careerActionId?: CareerActionId
  /** Bugün kullanıldı mı (view-only gösterim). */
  usedToday?: boolean
  /** C4-lite: RefApp'te tıklanabilir mi? */
  bindable?: boolean
  /** Tahmini mesai/aksiyon geliri. */
  estimatedPay?: number
}

export interface RefCareerJobOptionVM {
  id: CareerJobId
  name: string
  emoji: string
  description: string
  dailyWage: number
  stressDelta: number
  careerPath?: string
}

export interface RefCareerTimelineVM {
  id: string
  label: string
  status: RefTimelineStatus
  pct?: number
}

export interface RefCareerSkillVM {
  id: string
  name: string
  emoji: string
  level: number
  max: number
  pct: number
  source: 'real' | 'preview'
  unlocked: boolean
}

export interface RefFirstBusinessGoalVM {
  producerId: string
  producerName: string
  producerEmoji: string
  costRequired: number
  moneyCurrent: number
  pct: number
  complete: boolean
}

export interface RefCareerVM {
  phase: RefCareerPhase
  phaseLabel: string
  jobTitle: string
  jobCompany: string
  level: number
  /** View-only çalışan maaşı — pasif gelir değil */
  wageDaily: number
  /** Gerçek işletme pasif geliri (incomePerDay) */
  businessIncomeDaily: number
  showWage: boolean
  showBusinessIncome: boolean
  stress: number
  seniorityYears: number
  /** PlayerRank terfi ilerlemesi */
  promoPct: number
  promoText: string
  nextRank: string
  /** View-only kariyer XP (ekonomiye bağlı değil) */
  careerXpPct: number
  careerXpText: string
  transitionBanner: string
  actionsRemaining: number
  actionsMax: number
  actions: RefCareerActionVM[]
  firstBusinessGoal: RefFirstBusinessGoalVM
  timeline: RefCareerTimelineVM[]
  skills: RefCareerSkillVM[]
  /** İş seçimi ekranı gösterilsin mi? */
  needsJobSelection: boolean
  availableJobs: RefCareerJobOptionVM[]
  /** Bugünkü mesai/aksiyon geliri (wageEarnedToday). */
  shiftIncomeToday: number
  /** Bugün alınan normal günlük maaş. */
  dailyWageReceivedToday: number
  /** Manuel "Günlük Maaşı Al" butonu aktif mi? */
  canCollectWage: boolean
  /** Bu oyun gününde maaş zaten alındı mı? */
  wageCollectedToday: boolean
  /** Günlük aksiyonlar aktif mi? */
  actionsEnabled: boolean
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

/* ── Kariyer faz & view-only türetme (C2+C3) ── */

const TYCOON_NET_WORTH = 1_000_000
const HOLDING_NET_WORTH = 100_000_000

const EMPLOYEE_JOBS: { minEarned: number; title: string; company: string; wage: number }[] = [
  { minEarned: 0,      title: 'Stajyer',        company: 'Metro Market',      wage: 85 },
  { minEarned: 100,    title: 'Kasiyer',        company: 'Şok Express',       wage: 140 },
  { minEarned: 1_000,  title: 'Ofis Çalışanı',  company: 'TeknoOfis A.Ş.',    wage: 240 },
  { minEarned: 10_000, title: 'Kurye',          company: 'Hızlı Kargo Ltd.',  wage: 320 },
  { minEarned: 50_000, title: 'Barista',        company: 'Kahve Durağı',      wage: 360 },
]

const CAREER_ACTIONS: RefCareerActionVM[] = [
  { id: 'shift', ico: '🕐', label: 'Mesai Yap', effect: '+maaş · +XP', careerActionId: 'mesai' },
  { id: 'overtime', ico: '🌙', label: 'Ek Mesai', effect: '+maaş · +stres', careerActionId: 'ek_mesai' },
  { id: 'training', ico: '🎓', label: 'Eğitim Al', effect: '+beceri', careerActionId: 'egitim_al' },
  { id: 'networking', ico: '🌐', label: 'Networking', effect: '+bağlantı', careerActionId: 'networking' },
  { id: 'freelance', ico: '💻', label: 'Freelance İş Al', effect: '+ek gelir', careerActionId: 'musteri_bul' },
  { id: 'interview', ico: '🤝', label: 'İş Görüşmesine Git', effect: '+terfi şansı', careerActionId: 'satis_kapat' },
]

function careerActionsForToday(
  career: CareerState,
  gameTimeMs: number,
  actionsEnabled: boolean,
): RefCareerActionVM[] {
  const day = gameDay(gameTimeMs)
  const used = career.lastActionDay === day ? career.actionsUsedToday : []
  return CAREER_ACTIONS.map((a) => {
    const actionId = a.careerActionId
    const bindable = actionsEnabled
      && !!actionId
      && BINDABLE_CAREER_ACTION_IDS.includes(actionId)
    const estimatedPay = actionId && bindable ? estimatedCareerActionPay(career, actionId) : 0
    let effect = a.effect
    if (bindable && estimatedPay > 0) {
      effect = `+${fmt(estimatedPay)} · +XP`
    } else if (bindable && actionId === 'egitim_al') {
      effect = '+XP · −stres'
    }
    return {
      ...a,
      effect,
      usedToday: actionId ? used.includes(actionId) : false,
      bindable,
      estimatedPay,
    }
  })
}

function buildAvailableJobs(): RefCareerJobOptionVM[] {
  return CAREER_JOBS.map((j) => ({
    id: j.id,
    name: j.name,
    emoji: j.emoji,
    description: j.description,
    dailyWage: Math.floor(j.baseDailyWage * careerWageMultiplier(1)),
    stressDelta: j.stressDelta,
    careerPath: j.careerPath,
  }))
}

function careerActionsRemaining(career: CareerState, gameTimeMs: number): { remaining: number; max: number } {
  const day = gameDay(gameTimeMs)
  const used = career.lastActionDay === day ? career.actionsUsedToday.length : 0
  const max = CAREER_ACTIONS.length
  return { remaining: Math.max(0, max - used), max }
}

/** Kariyer beceri kartları — PlayerSkills ile eşleşme (view-only ilerleme). */
const CAREER_SKILL_MAP: {
  id: string
  name: string
  emoji: string
  playerSkillId?: PlayerSkillId
  metric: 'totalClicks' | 'businessesOwned' | 'totalEarned' | 'ipoCount' | 'lifeEventsResolved'
  thresholds: number[]
}[] = [
  { id: 'sales',       name: 'Satış',     emoji: '📈', playerSkillId: 'entrepreneur_spirit', metric: 'totalClicks',         thresholds: [100, 300, 500, 2000, 5000] },
  { id: 'management',  name: 'Yönetim',   emoji: '🏢', playerSkillId: 'businessman',         metric: 'businessesOwned',     thresholds: [1, 5, 15, 30, 50] },
  { id: 'finance',     name: 'Finans',    emoji: '💰', playerSkillId: 'wealth_magnet',       metric: 'totalEarned',         thresholds: [10_000, 100_000, 1_000_000, 100_000_000, 1_000_000_000] },
  { id: 'network',     name: 'Network',   emoji: '🌐', playerSkillId: 'life_experience',     metric: 'lifeEventsResolved',  thresholds: [2, 4, 6, 8, 10] },
  { id: 'operations',  name: 'Operasyon', emoji: '⚙️', playerSkillId: 'veteran_baron',       metric: 'ipoCount',            thresholds: [1, 2, 3, 4, 5] },
]

function deriveCareerPhase(career: CareerState, ownedCount: number, netWorth: number): RefCareerPhase {
  if (career.isEntrepreneur || ownedCount > 0) {
    if (netWorth < TYCOON_NET_WORTH) return 'entrepreneur'
    return 'tycoon'
  }
  return 'employee'
}

function phaseLabel(phase: RefCareerPhase): string {
  switch (phase) {
    case 'employee': return 'Çalışan'
    case 'entrepreneur': return 'Girişimci'
    case 'tycoon': return 'Patron'
  }
}

function employeeJob(totalEarned: number, playerName: string): (typeof EMPLOYEE_JOBS)[number] {
  let job = EMPLOYEE_JOBS[0]!
  for (const j of EMPLOYEE_JOBS) if (totalEarned >= j.minEarned) job = j
  // Kurye/Barista varyasyonu — oyuncuya göre deterministik
  if (job.title === 'Kurye' && hash(playerName + 'job') % 2 === 1) {
    return { ...job, title: 'Barista', company: 'Kahve Durağı', wage: 360 }
  }
  return job
}

function entrepreneurTitle(state: GameState, ownedCount: number): { title: string; company: string } {
  const first = PRODUCERS.find((p) => (state.producers[p.id] ?? 0) > 0)
  if (first) {
    return {
      title: 'Girişimci',
      company: `${producerName(first)} · Kurucu`,
    }
  }
  return { title: 'Girişimci', company: `${ownedCount} işletme` }
}

function tycoonTitle(netWorth: number, rank: PlayerRankDef): { title: string; company: string } {
  const nwRank = rankFor(netWorth)
  return {
    title: nwRank.title,
    company: rank.name === 'Holding Sahibi' || rank.name === 'İmparator'
      ? 'Holding Grubu'
      : 'Çoklu İşletme Portföyü',
  }
}

function careerLevel(totalEarned: number, ownedCount: number, ipoCount: number): number {
  const base = Math.floor(Math.log10(Math.max(10, totalEarned + 1)) * 3)
  return Math.max(1, Math.min(99, base + ownedCount + ipoCount * 2))
}

function skillLevelFromMetric(value: number, thresholds: number[]): { level: number; pct: number } {
  let level = 0
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]!) level = i + 1
  }
  const max = thresholds.length
  if (level >= max) return { level: max, pct: 100 }
  const prev = level > 0 ? thresholds[level - 1]! : 0
  const next = thresholds[level] ?? thresholds[max - 1]!
  const span = next - prev
  const pct = span > 0 ? Math.min(100, Math.round(((value - prev) / span) * 100)) : 0
  return { level, pct }
}

function deriveCareerSkills(state: GameState): RefCareerSkillVM[] {
  const bizCount = Object.values(state.producers).filter((n) => n > 0).length
  const metrics = {
    totalClicks: state.totalClicks,
    businessesOwned: bizCount,
    totalEarned: state.totalEarned,
    ipoCount: state.ipoCount,
    lifeEventsResolved: state.playerSkills?.lifeEventsResolved ?? 0,
  }
  return CAREER_SKILL_MAP.map((def) => {
    const value = metrics[def.metric]
    const { level, pct } = skillLevelFromMetric(value, def.thresholds)
    const unlocked = def.playerSkillId
      ? hasSkill(state.playerSkills, def.playerSkillId)
      : false
    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      level: unlocked ? def.thresholds.length : level,
      max: def.thresholds.length,
      pct: unlocked ? 100 : pct,
      source: unlocked ? 'real' as const : 'preview' as const,
      unlocked,
    }
  })
}

function deriveTimeline(
  phase: RefCareerPhase,
  ownedCount: number,
  netWorth: number,
  firstBizPct: number,
): RefCareerTimelineVM[] {
  const stages: { id: string; label: string; unlock: () => RefTimelineStatus }[] = [
    {
      id: 'employee',
      label: 'Çalışan',
      unlock: () => (ownedCount > 0 ? 'done' : 'active'),
    },
    {
      id: 'entrepreneur',
      label: 'Girişimci',
      unlock: () => {
        if (ownedCount === 0) return 'locked'
        if (netWorth >= TYCOON_NET_WORTH) return 'done'
        return phase === 'entrepreneur' ? 'active' : 'done'
      },
    },
    {
      id: 'patron',
      label: 'Patron',
      unlock: () => {
        if (netWorth < TYCOON_NET_WORTH) return ownedCount > 0 ? 'locked' : 'locked'
        if (netWorth >= HOLDING_NET_WORTH) return 'done'
        return phase === 'tycoon' ? 'active' : 'locked'
      },
    },
    {
      id: 'holding',
      label: 'Holding Sahibi',
      unlock: () => {
        if (netWorth < HOLDING_NET_WORTH) return 'locked'
        return 'active'
      },
    },
  ]
  return stages.map((s) => {
    const status = s.unlock()
    let pct: number | undefined
    if (status === 'active') {
      if (s.id === 'employee') pct = firstBizPct
      else if (s.id === 'entrepreneur') pct = Math.min(100, Math.round((netWorth / TYCOON_NET_WORTH) * 100))
      else if (s.id === 'patron') pct = Math.min(100, Math.round((netWorth / HOLDING_NET_WORTH) * 100))
      else pct = Math.min(100, Math.round((netWorth / HOLDING_NET_WORTH) * 100))
    }
    return { id: s.id, label: s.label, status, pct }
  })
}

function transitionBanner(phase: RefCareerPhase): string {
  switch (phase) {
    case 'employee':
      return 'Biriktir, ilk işletmeni kur ve girişimci yoluna geç.'
    case 'entrepreneur':
      return 'İlk işletmeni büyüt, patron yoluna ilerle.'
    case 'tycoon':
      return 'Holding seviyesine geçiş başladı.'
  }
}

/** GameState → kariyer view-model (salt okunur). Refresh ve ilk render için. */
export function buildRefCareerVM(state: GameState): RefCareerVM {
  const career = state.career
  const netWorth = Math.round(state.financeNetWorth())
  const businessIncomeDaily = Math.round(state.incomePerDay())
  const ownedCount = ownedBusinessCount(state.producers)
  const phase = deriveCareerPhase(career, ownedCount, netWorth)
  const age = state.playerAge()
  const promo = rankProgress(state.totalEarned)
  const rank = currentRank(state.totalEarned)
  const actionStatus = careerActionsRemaining(career, state.gameTimeMs)
  const hasRealJob = !!career.jobId && !career.isEntrepreneur
  const jobDef = careerJobDef(career.jobId)
  const needsJobSelection = phase === 'employee' && ownedCount === 0 && !career.jobId && !career.isEntrepreneur
  const actionsEnabled = hasRealJob && phase === 'employee'
  const today = gameDay(state.gameTimeMs)
  const shiftIncomeToday = hasRealJob && career.lastActionDay === today
    ? Math.round(career.wageEarnedToday)
    : 0
  const wageCollectedToday = hasRealJob && career.lastWageDay >= today
  const dailyWageReceivedToday = wageCollectedToday
    ? Math.round(career.dailyWagePaidToday ?? 0)
    : 0
  const canCollectWage = hasRealJob
    && phase === 'employee'
    && ownedCount === 0
    && !wageCollectedToday
    && dailyCareerWage(career) > 0

  let jobTitle: string
  let jobCompany: string
  let wageDaily = 0

  if (needsJobSelection) {
    jobTitle = 'İş seçimi bekleniyor'
    jobCompany = 'Aşağıdan ilk işini seç'
  } else if (hasRealJob && jobDef) {
    jobTitle = jobDef.name
    jobCompany = `${jobDef.emoji} ${jobDef.description.split('.')[0]} · Tam zamanlı`
    wageDaily = dailyCareerWage(career)
  } else if (phase === 'employee') {
    const job = employeeJob(state.totalEarned, state.playerName)
    jobTitle = career.jobId ? (jobDef?.name ?? job.title) : 'İşsiz'
    jobCompany = career.jobId && jobDef
      ? `${jobDef.emoji} Başlangıç işi`
      : `${job.company} · İş ara`
    wageDaily = career.jobId ? dailyCareerWage(career) : job.wage
  } else if (phase === 'entrepreneur') {
    const ent = entrepreneurTitle(state, ownedCount)
    jobTitle = ent.title
    jobCompany = ent.company
    wageDaily = 0
  } else {
    const ty = tycoonTitle(netWorth, rank)
    jobTitle = ty.title
    jobCompany = ty.company
    wageDaily = 0
  }

  const stajyerDef = PRODUCERS.find((p) => p.id === 'stajyer')
  const stajyerOwned = state.producers['stajyer'] ?? 0
  const firstBizCost = stajyerDef
    ? state.producerCostFor(stajyerDef, stajyerOwned, 1)
    : 3
  const moneyCurrent = Math.round(state.money)
  const firstBizComplete = ownedCount > 0 || career.firstGoalComplete || career.isEntrepreneur

  const careerXpPct = career.level >= 10
    ? 100
    : Math.min(100, Math.round((career.xp / Math.max(1, career.xpToNext)) * 100))
  const careerXpText = career.level >= 10
    ? 'Maksimum seviye'
    : `${career.xp} / ${career.xpToNext} XP`

  const savingsGoal = FIRST_GOAL_TARGET
  const savingsPct = firstBizComplete
    ? 100
    : Math.min(100, Math.round((moneyCurrent / Math.max(1, savingsGoal)) * 100))

  const stressVal = (phase === 'employee' && (hasRealJob || career.jobId))
    ? Math.round(career.stress)
    : Math.round(state.lifestyle.stress)

  return {
    phase,
    phaseLabel: phaseLabel(phase),
    jobTitle,
    jobCompany,
    level: hasRealJob || career.jobId ? career.level : careerLevel(state.totalEarned, ownedCount, state.ipoCount),
    wageDaily,
    businessIncomeDaily,
    showWage: hasRealJob && phase === 'employee' && wageDaily > 0,
    showBusinessIncome: ownedCount > 0,
    stress: stressVal,
    seniorityYears: Math.max(0, age - 18),
    promoPct: promo.pct,
    promoText: promo.next
      ? `${fmt(state.totalEarned)} / ${fmt(promo.next.minEarned)}`
      : 'Maksimum',
    nextRank: promo.next ? `${promo.next.emoji} ${promo.next.name}` : '—',
    careerXpPct,
    careerXpText,
    transitionBanner: transitionBanner(phase),
    actionsRemaining: actionStatus.remaining,
    actionsMax: actionStatus.max,
    actions: careerActionsForToday(career, state.gameTimeMs, actionsEnabled),
    firstBusinessGoal: {
      producerId: 'stajyer',
      producerName: stajyerDef ? producerName(stajyerDef) : 'Limonata Tezgahı',
      producerEmoji: stajyerDef?.emoji ?? '🍋',
      costRequired: phase === 'employee' && !firstBizComplete ? savingsGoal : firstBizCost,
      moneyCurrent,
      pct: phase === 'employee' && !firstBizComplete ? savingsPct : (
        firstBizComplete ? 100 : Math.min(100, Math.round((moneyCurrent / Math.max(1, firstBizCost)) * 100))
      ),
      complete: firstBizComplete,
    },
    timeline: deriveTimeline(
      phase,
      ownedCount,
      netWorth,
      phase === 'employee' && !firstBizComplete ? savingsPct : (
        firstBizComplete ? 100 : Math.min(100, Math.round((moneyCurrent / Math.max(1, firstBizCost)) * 100))
      ),
    ),
    skills: deriveCareerSkills(state),
    needsJobSelection,
    availableJobs: needsJobSelection ? buildAvailableJobs() : [],
    shiftIncomeToday,
    dailyWageReceivedToday,
    canCollectWage,
    wageCollectedToday,
    actionsEnabled,
  }
}

/** DEV-only kariyer faz önizleme modları (GameState'e yazılmaz). */
export type RefCareerDevPreviewMode = 'real' | 'employee' | 'entrepreneur' | 'tycoon'

const PREVIEW_SKILLS_LOW: RefCareerSkillVM[] = [
  { id: 'sales', name: 'Satış', emoji: '📈', level: 1, max: 5, pct: 25, source: 'preview', unlocked: false },
  { id: 'management', name: 'Yönetim', emoji: '🏢', level: 0, max: 5, pct: 8, source: 'preview', unlocked: false },
  { id: 'finance', name: 'Finans', emoji: '💰', level: 0, max: 5, pct: 5, source: 'preview', unlocked: false },
  { id: 'network', name: 'Network', emoji: '🌐', level: 1, max: 5, pct: 30, source: 'preview', unlocked: false },
  { id: 'operations', name: 'Operasyon', emoji: '⚙️', level: 0, max: 5, pct: 0, source: 'preview', unlocked: false },
]

const PREVIEW_SKILLS_MID: RefCareerSkillVM[] = [
  { id: 'sales', name: 'Satış', emoji: '📈', level: 3, max: 5, pct: 55, source: 'preview', unlocked: false },
  { id: 'management', name: 'Yönetim', emoji: '🏢', level: 2, max: 5, pct: 40, source: 'preview', unlocked: false },
  { id: 'finance', name: 'Finans', emoji: '💰', level: 1, max: 5, pct: 22, source: 'preview', unlocked: false },
  { id: 'network', name: 'Network', emoji: '🌐', level: 2, max: 5, pct: 48, source: 'preview', unlocked: false },
  { id: 'operations', name: 'Operasyon', emoji: '⚙️', level: 1, max: 5, pct: 18, source: 'preview', unlocked: false },
]

const PREVIEW_SKILLS_HIGH: RefCareerSkillVM[] = [
  { id: 'sales', name: 'Satış', emoji: '📈', level: 5, max: 5, pct: 100, source: 'preview', unlocked: false },
  { id: 'management', name: 'Yönetim', emoji: '🏢', level: 4, max: 5, pct: 78, source: 'preview', unlocked: false },
  { id: 'finance', name: 'Finans', emoji: '💰', level: 4, max: 5, pct: 82, source: 'preview', unlocked: false },
  { id: 'network', name: 'Network', emoji: '🌐', level: 3, max: 5, pct: 60, source: 'preview', unlocked: false },
  { id: 'operations', name: 'Operasyon', emoji: '⚙️', level: 3, max: 5, pct: 55, source: 'preview', unlocked: false },
]

/**
 * Kariyer ekranı DEV faz önizlemesi — yalnızca UI görünümü.
 * GameState / localStorage'a yazılmaz; gerçek VM'den stres/kıdem okunabilir.
 */
export function buildRefCareerPhasePreview(
  mode: Exclude<RefCareerDevPreviewMode, 'real'>,
  base?: RefCareerVM,
): RefCareerVM {
  const stress = base?.stress ?? 22
  const seniorityYears = base?.seniorityYears ?? 2
  const actions = base?.actions ?? CAREER_ACTIONS
  const actionsRemaining = base?.actionsRemaining ?? 2
  const actionsMax = base?.actionsMax ?? 3
  const firstBizBase = base?.firstBusinessGoal

  const firstBizOpen = {
    producerId: 'stajyer',
    producerName: firstBizBase?.producerName ?? 'Limonata Tezgahı',
    producerEmoji: firstBizBase?.producerEmoji ?? '🍋',
    costRequired: firstBizBase?.costRequired ?? 3,
    moneyCurrent: 2,
    pct: 67,
    complete: false,
  }

  const firstBizDone = {
    producerId: 'stajyer',
    producerName: firstBizBase?.producerName ?? 'Limonata Tezgahı',
    producerEmoji: firstBizBase?.producerEmoji ?? '🍋',
    costRequired: firstBizBase?.costRequired ?? 3,
    moneyCurrent: firstBizBase?.costRequired ?? 3,
    pct: 100,
    complete: true,
  }

  const bizIncome = base?.businessIncomeDaily && base.businessIncomeDaily > 0
    ? base.businessIncomeDaily
    : 42

  const previewJobMeta = {
    needsJobSelection: false,
    availableJobs: [],
    shiftIncomeToday: 0,
    dailyWageReceivedToday: 0,
    canCollectWage: false,
    wageCollectedToday: false,
    actionsEnabled: false,
  }

  switch (mode) {
    case 'employee':
      return {
        phase: 'employee',
        phaseLabel: 'Çalışan',
        jobTitle: 'Stajyer',
        jobCompany: 'Metro Market · Tam zamanlı',
        level: 2,
        wageDaily: 85,
        businessIncomeDaily: 0,
        showWage: true,
        showBusinessIncome: false,
        stress,
        seniorityYears,
        promoPct: 35,
        promoText: '45 / 100',
        nextRank: '📚 Stajyer',
        careerXpPct: 28,
        careerXpText: 'Kariyer XP · 28%',
        transitionBanner: transitionBanner('employee'),
        actionsRemaining,
        actionsMax,
        actions,
        firstBusinessGoal: firstBizOpen,
        timeline: [
          { id: 'employee', label: 'Çalışan', status: 'active', pct: 67 },
          { id: 'entrepreneur', label: 'Girişimci', status: 'locked' },
          { id: 'patron', label: 'Patron', status: 'locked' },
          { id: 'holding', label: 'Holding Sahibi', status: 'locked' },
        ],
        skills: PREVIEW_SKILLS_LOW,
        ...previewJobMeta,
      }
    case 'entrepreneur':
      return {
        phase: 'entrepreneur',
        phaseLabel: 'Girişimci',
        jobTitle: 'Girişimci',
        jobCompany: 'Limonata Tezgahı · Kurucu',
        level: 8,
        wageDaily: 0,
        businessIncomeDaily: bizIncome,
        showWage: false,
        showBusinessIncome: true,
        stress,
        seniorityYears,
        promoPct: 52,
        promoText: '2.4K / 10K',
        nextRank: '🏪 İşletmeci',
        careerXpPct: 48,
        careerXpText: 'Kariyer XP · 48%',
        transitionBanner: transitionBanner('entrepreneur'),
        actionsRemaining,
        actionsMax,
        actions,
        firstBusinessGoal: firstBizDone,
        timeline: [
          { id: 'employee', label: 'Çalışan', status: 'done' },
          { id: 'entrepreneur', label: 'Girişimci', status: 'active', pct: 35 },
          { id: 'patron', label: 'Patron', status: 'locked' },
          { id: 'holding', label: 'Holding Sahibi', status: 'locked' },
        ],
        skills: PREVIEW_SKILLS_MID,
        ...previewJobMeta,
      }
    case 'tycoon':
      return {
        phase: 'tycoon',
        phaseLabel: 'Patron',
        jobTitle: 'Holding Başkanı',
        jobCompany: 'Çoklu İşletme Portföyü',
        level: 24,
        wageDaily: 0,
        businessIncomeDaily: bizIncome > 42 ? bizIncome : 12_500,
        showWage: false,
        showBusinessIncome: true,
        stress,
        seniorityYears,
        promoPct: 68,
        promoText: '4.2M / 10M',
        nextRank: '🏢 Holding Sahibi',
        careerXpPct: 72,
        careerXpText: 'Kariyer XP · 72%',
        transitionBanner: transitionBanner('tycoon'),
        actionsRemaining,
        actionsMax,
        actions,
        firstBusinessGoal: firstBizDone,
        timeline: [
          { id: 'employee', label: 'Çalışan', status: 'done' },
          { id: 'entrepreneur', label: 'Girişimci', status: 'done' },
          { id: 'patron', label: 'Patron', status: 'active', pct: 45 },
          { id: 'holding', label: 'Holding Sahibi', status: 'locked' },
        ],
        skills: PREVIEW_SKILLS_HIGH,
        ...previewJobMeta,
      }
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
    incomeSources: incomeSources.length ? incomeSources : [{ label: 'Henüz yok', value: 100, color: '#94B4C2' }],
    netWorthTrend: deriveNetWorthTrend(netWorth),   // gerçek netWorth'ten türetilmiş tahmini eğri
    goals,
  }

  const career = buildRefCareerVM(state)

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
