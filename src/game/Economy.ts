export type ProducerCategory = 'sport' | 'politics' | 'dark'

export interface ProducerDef {
  id: string
  name: string
  emoji: string
  description: string
  tier: number
  unlockAt: number
  baseCost: number
  /** Birim başına baz gelir (/sn) — ekonomi ölçeği uygulanmış */
  baseIncome: number
  costMultiplier: number
  category?: ProducerCategory
  /** Yüksek gelir, baskın riski */
  illegal?: boolean
  riskChance?: number
  riskFinePct?: number
}

export interface UpgradeDef {
  id: string
  name: string
  description: string
  cost: number
  effect: 'click_mult' | 'global_mult' | 'producer_mult'
  value: number
  producerId?: string
}

export const PRODUCERS: ProducerDef[] = [
  // BitLife maaş eğrisi: baseIncome ≈ günlük $ (1 sn = 1 oyun günü)
  { id: 'stajyer', name: 'Limonata Tezgahı', emoji: '🍋', description: 'Küçük ama cesur bir girişim.', tier: 1, unlockAt: 0, baseCost: 306, baseIncome: 6, costMultiplier: 1.18 },
  { id: 'robot', name: 'E-ticaret Sitesi', emoji: '🛒', description: 'Online satışlar başladı.', tier: 2, unlockAt: 1_200, baseCost: 580, baseIncome: 10, costMultiplier: 1.18 },
  { id: 'kafe', name: 'Kahve Zinciri', emoji: '☕', description: 'Her köşede bir şube.', tier: 2, unlockAt: 6_000, baseCost: 580, baseIncome: 10, costMultiplier: 1.18 },
  { id: 'ofis', name: 'Restoran Zinciri', emoji: '🍽️', description: 'Lezzetli büyüme.', tier: 3, unlockAt: 28_000, baseCost: 1_105, baseIncome: 17, costMultiplier: 1.18 },
  { id: 'fabrika', name: 'Lojistik Merkezi', emoji: '🚚', description: 'Tedarik zinciri güçleniyor.', tier: 4, unlockAt: 120_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.18 },
  { id: 'mobil_app', name: 'Mobil Uygulama', emoji: '📱', description: 'Abonelik geliri akıyor.', tier: 4, unlockAt: 120_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.18 },
  { id: 'holding', name: 'Yazılım Şirketi', emoji: '💻', description: 'Teknoloji imparatorluğu.', tier: 5, unlockAt: 500_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.18 },
  { id: 'uzay', name: 'Gayrimenkul Portföyü', emoji: '🏙️', description: 'Arsa ve bina yatırımları.', tier: 6, unlockAt: 2_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.18 },
  { id: 'enerji', name: 'Güneş Enerjisi Santrali', emoji: '☀️', description: 'Temiz enerji, temiz kâr.', tier: 6, unlockAt: 2_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.18 },
  { id: 'ai', name: 'Holding Birleşmesi', emoji: '🤝', description: 'Rakiplerle stratejik birleşme.', tier: 7, unlockAt: 10_000_000, baseCost: 14_694, baseIncome: 158, costMultiplier: 1.18 },
  { id: 'tuzaq', name: 'Borsa IPO', emoji: '📈', description: 'Halka arz — zirve noktası.', tier: 8, unlockAt: 45_000_000, baseCost: 27_600, baseIncome: 276, costMultiplier: 1.18 },
  { id: 'uydu', name: 'Uydu İnternet Ağı', emoji: '🛰️', description: 'Küresel bağlantı imparatorluğu.', tier: 9, unlockAt: 200_000_000, baseCost: 51_788, baseIncome: 484, costMultiplier: 1.18 },
  { id: 'merkezbankasi', name: 'Küresel Merkez Bankası', emoji: '🏦', description: 'Para basan makine.', tier: 10, unlockAt: 900_000_000, baseCost: 96_558, baseIncome: 847, costMultiplier: 1.18 },
  { id: 'galaksiyum', name: 'Galaktik Tekno-İmparatorluk', emoji: '🌌', description: 'Evreni avucunun içine aldın.', tier: 11, unlockAt: 4_000_000_000, baseCost: 179_322, baseIncome: 1_482, costMultiplier: 1.18 },
  { id: 'kripto', name: 'Kripto Borsası', emoji: '₿', description: 'Volatil ama kârlı dijital pazar.', tier: 5, unlockAt: 500_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.19 },
  { id: 'nano', name: 'Nano Teknoloji Lab', emoji: '🔬', description: 'Atom ölçeğinde devrim.', tier: 10, unlockAt: 900_000_000, baseCost: 96_558, baseIncome: 847, costMultiplier: 1.18 },
  { id: 'bahis', name: 'Gizli Bahis Ağı', emoji: '🎲', description: 'Yüksek gelir, yüksek risk.', tier: 3, unlockAt: 28_000, baseCost: 1_365, baseIncome: 21, costMultiplier: 1.20, illegal: true, riskChance: 0.06, riskFinePct: 0.18 },
  { id: 'piramit', name: 'Piramit Şema', emoji: '🔺', description: 'Kısa vadede patlar, uzun vadede yakalanırsın.', tier: 5, unlockAt: 500_000, baseCost: 4_977, baseIncome: 63, costMultiplier: 1.20, illegal: true, riskChance: 0.05, riskFinePct: 0.22 },
  { id: 'offshore', name: 'Offshore Hesap', emoji: '🏝️', description: 'Vergiden kaç, radar altında kal.', tier: 7, unlockAt: 10_000_000, baseCost: 17_949, baseIncome: 193, costMultiplier: 1.20, illegal: true, riskChance: 0.04, riskFinePct: 0.15 },
  { id: 'data_center', name: 'Veri Merkezi', emoji: '🖥️', description: 'Bulut altyapısı kiraları.', tier: 4, unlockAt: 120_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.18 },
  { id: 'drone', name: 'Drone Teslimat Filosu', emoji: '🚁', description: 'Havadan hızlı lojistik.', tier: 6, unlockAt: 2_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.18 },
  { id: 'otel', name: 'Otel Zinciri', emoji: '🏨', description: 'Turizm ve konaklama geliri.', tier: 3, unlockAt: 28_000, baseCost: 1_105, baseIncome: 17, costMultiplier: 1.18 },
  { id: 'medya', name: 'Medya Holding', emoji: '📺', description: 'Haber, reklam ve içerik imparatorluğu.', tier: 4, unlockAt: 120_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.18 },
  { id: 'streaming', name: 'Streaming Platformu', emoji: '🎬', description: 'Abonelik ve reklam geliri.', tier: 4, unlockAt: 120_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.18 },
  { id: 'ilac', name: 'İlaç Laboratuvarı', emoji: '💊', description: 'Ar-Ge ve patent gelirleri.', tier: 5, unlockAt: 500_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.18 },
  { id: 'sigorta', name: 'Sigorta Şirketi', emoji: '🛡️', description: 'Prim ve yatırım getirisi.', tier: 5, unlockAt: 500_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.18 },
  { id: 'ev_araba', name: 'Elektrikli Araç Fabrikası', emoji: '⚡', description: 'Geleceğin otomobil devi.', tier: 6, unlockAt: 2_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.18 },
  { id: 'futbol_amateur', name: 'Amatör Futbol Kulübü', emoji: '⚽', description: '3. Lig\'de küçük ama tutkulu bir kulüp.', tier: 3, unlockAt: 28_000, baseCost: 1_170, baseIncome: 18, costMultiplier: 1.18, category: 'sport' },
  { id: 'futbol_superlig', name: 'Süper Lig Kulübü', emoji: '🏟️', description: 'Stadyum, sponsorluk ve transfer geliri.', tier: 6, unlockAt: 2_000_000, baseCost: 8_342, baseIncome: 97, costMultiplier: 1.19, category: 'sport' },
  { id: 'futbol_avrupa', name: 'Avrupa Kupası Kulübü', emoji: '🏆', description: 'Kıtasal şampiyonluk yarışı.', tier: 8, unlockAt: 45_000_000, baseCost: 29_800, baseIncome: 298, costMultiplier: 1.20, category: 'sport' },
  { id: 'siyaset_belediye', name: 'Belediye Meclisi', emoji: '🏛️', description: 'Yerel siyasette ilk adım.', tier: 4, unlockAt: 120_000, baseCost: 2_160, baseIncome: 30, costMultiplier: 1.18, category: 'politics' },
  { id: 'siyaset_milletvekili', name: 'Milletvekili Ofisi', emoji: '🗳️', description: 'Mecliste lobi gücü.', tier: 6, unlockAt: 2_000_000, baseCost: 8_170, baseIncome: 95, costMultiplier: 1.19, category: 'politics' },
  { id: 'siyaset_bakan', name: 'Bakanlık Bütçesi', emoji: '👔', description: 'Bakanlık kaynakları ve düzenleme.', tier: 8, unlockAt: 45_000_000, baseCost: 29_000, baseIncome: 290, costMultiplier: 1.20, category: 'politics' },
  { id: 'siyaset_cumhurbaskanligi', name: 'Cumhurbaşkanlığı Kampanyası', emoji: '🎖️', description: 'Ülkenin zirvesine oyna.', tier: 10, unlockAt: 900_000_000, baseCost: 101_346, baseIncome: 889, costMultiplier: 1.21, category: 'politics' },
  { id: 'kacak_imalat', name: 'Kaçak İmalat Hattı', emoji: '🔧', description: 'Vergisiz üretim, yüksek risk.', tier: 4, unlockAt: 120_000, baseCost: 2_952, baseIncome: 41, costMultiplier: 1.20, illegal: true, category: 'dark', riskChance: 0.07, riskFinePct: 0.16 },
  { id: 'siyah_fabrika', name: 'Siyah Fabrika', emoji: '🏭', description: 'Radar altında yasadışı üretim.', tier: 5, unlockAt: 500_000, baseCost: 5_846, baseIncome: 74, costMultiplier: 1.20, illegal: true, category: 'dark', riskChance: 0.06, riskFinePct: 0.20 },
  { id: 'silah_ticareti', name: 'Silah Kaçakçılığı', emoji: '🔫', description: 'Tehlikeli ama çok kârlı ağ.', tier: 7, unlockAt: 10_000_000, baseCost: 21_204, baseIncome: 228, costMultiplier: 1.21, illegal: true, category: 'dark', riskChance: 0.05, riskFinePct: 0.25 },
]

export const UPGRADES: UpgradeDef[] = [
  { id: 'click_x2', name: 'Pazarlama Kampanyası', description: 'Tıklama geliri x2', cost: 45, effect: 'click_mult', value: 2 },
  { id: 'click_x5', name: 'Viral Reklam', description: 'Tıklama geliri x5', cost: 450, effect: 'click_mult', value: 5 },
  { id: 'global_x2', name: 'Kurumsal Büyüme', description: 'Tüm gelir x2', cost: 1_800, effect: 'global_mult', value: 2 },
  { id: 'stajyer_x2', name: 'Franchise Sistemi', description: 'Limonata geliri x2', cost: 120, effect: 'producer_mult', value: 2, producerId: 'stajyer' },
  { id: 'robot_x2', name: 'SEO Optimizasyonu', description: 'E-ticaret geliri x2', cost: 750, effect: 'producer_mult', value: 2, producerId: 'robot' },
  { id: 'fabrika_x2', name: 'Depo Otomasyonu', description: 'Lojistik geliri x2', cost: 8_500, effect: 'producer_mult', value: 2, producerId: 'fabrika' },
  { id: 'holding_x2', name: 'Bulut Altyapısı', description: 'Yazılım geliri x2', cost: 35_000, effect: 'producer_mult', value: 2, producerId: 'holding' },
  { id: 'ofis_x2', name: 'Franchise Genişlemesi', description: 'Restoran geliri x2', cost: 4_200, effect: 'producer_mult', value: 2, producerId: 'ofis' },
  { id: 'uzay_x2', name: 'Portföy Yönetimi', description: 'Gayrimenkul geliri x2', cost: 120_000, effect: 'producer_mult', value: 2, producerId: 'uzay' },
  { id: 'ai_x2', name: 'Birleşme Sinergisi', description: 'Holding geliri x2', cost: 550_000, effect: 'producer_mult', value: 2, producerId: 'ai' },
  { id: 'tuzaq_x2', name: 'Halka Arz Boost', description: 'IPO geliri x2', cost: 2_500_000, effect: 'producer_mult', value: 2, producerId: 'tuzaq' },
  { id: 'global_x3', name: 'Global Expansion', description: 'Tüm gelir x1.5', cost: 45_000, effect: 'global_mult', value: 1.5 },
  { id: 'uydu_x2', name: 'Orbital Verimlilik', description: 'Uydu ağı geliri x2', cost: 1_800_000, effect: 'producer_mult', value: 2, producerId: 'uydu' },
  { id: 'merkezbankasi_x2', name: 'Para Politikası', description: 'Merkez bankası geliri x2', cost: 8_500_000, effect: 'producer_mult', value: 2, producerId: 'merkezbankasi' },
  { id: 'global_mega', name: 'Süper Büyüme', description: 'Tüm gelir x2', cost: 4_500_000, effect: 'global_mult', value: 2 },
  { id: 'kafe_x2', name: 'Franchise Kahve', description: 'Kahve zinciri geliri x2', cost: 2_200, effect: 'producer_mult', value: 2, producerId: 'kafe' },
  { id: 'mobil_app_x2', name: 'Premium Abonelik', description: 'Mobil uygulama geliri x2', cost: 18_000, effect: 'producer_mult', value: 2, producerId: 'mobil_app' },
  { id: 'enerji_x2', name: 'Panel Verimliliği', description: 'Güneş santrali geliri x2', cost: 180_000, effect: 'producer_mult', value: 2, producerId: 'enerji' },
  { id: 'click_x10', name: 'Influencer Kampanyası', description: 'Tıklama geliri x10', cost: 35_000, effect: 'click_mult', value: 10 },
  { id: 'offshore_laundry', name: 'Offshore Aklama', description: 'Illegal gelir −10%, heat −20%', cost: 850_000, effect: 'producer_mult', value: 0.9, producerId: 'offshore' },
  { id: 'otel_x2', name: 'Otel Franchise', description: 'Otel zinciri geliri x2', cost: 3_500, effect: 'producer_mult', value: 2, producerId: 'otel' },
  { id: 'medya_x2', name: 'Medya İmparatorluğu', description: 'Medya holding geliri x2', cost: 22_000, effect: 'producer_mult', value: 2, producerId: 'medya' },
  { id: 'futbol_x2', name: 'Transfer Sezonu', description: 'Futbol kulüpleri geliri x2', cost: 95_000, effect: 'producer_mult', value: 2, producerId: 'futbol_superlig' },
  { id: 'siyaset_x2', name: 'Lobi Gücü', description: 'Siyaset gelirleri x1.5', cost: 180_000, effect: 'global_mult', value: 1.5 },
  { id: 'siyah_fabrika_x2', name: 'Gizli Üretim', description: 'Siyah fabrika geliri x2', cost: 42_000, effect: 'producer_mult', value: 2, producerId: 'siyah_fabrika' },
]

/** BitLife uyumlu ekonomi — baseIncome = günlük maaş ($), 1 sn = 1 oyun günü */
export const ECONOMY_INCOME_SCALE = 1.0
export const ECONOMY_COST_SCALE = 1.05
export const ECONOMY_UNLOCK_SCALE = 1.0
export const ECONOMY_COST_GROWTH_BONUS = 0.018
export const ECONOMY_UPGRADE_COST_SCALE = 1.10
export const EARLY_UNLOCK_COST_SCALE = 1.55

export function scaledUnlockAt(def: ProducerDef): number {
  if (def.unlockAt <= 0) return 0
  return Math.floor(def.unlockAt * ECONOMY_UNLOCK_SCALE)
}

export function scaledBaseIncome(baseIncome: number): number {
  return Math.max(1, Math.floor(baseIncome * ECONOMY_INCOME_SCALE))
}

export function producerCost(def: ProducerDef, owned: number, count = 1): number {
  const growth = def.costMultiplier + ECONOMY_COST_GROWTH_BONUS
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(def.baseCost * Math.pow(growth, owned + i))
  }
  return Math.ceil(total * ECONOMY_COST_SCALE)
}

export function maxAffordable(def: ProducerDef, owned: number, money: number, costMultiplier = 1): number {
  let count = 0
  let spent = 0
  while (count < 1000) {
    const next = Math.floor(producerCost(def, owned + count, 1) * costMultiplier)
    if (spent + next > money) break
    spent += next
    count++
  }
  return count
}

export function isProducerUnlocked(
  def: ProducerDef,
  totalEarned: number,
  forcedUnlocks?: ReadonlySet<string>,
): boolean {
  return totalEarned >= scaledUnlockAt(def) || forcedUnlocks?.has(def.id) === true
}

export function earlyUnlockCost(def: ProducerDef): number {
  const unlock = scaledUnlockAt(def)
  const raw = Math.max(def.baseCost * 6, Math.floor(unlock * 0.22))
  return Math.ceil(raw * EARLY_UNLOCK_COST_SCALE)
}

export function producerIconPath(id: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}icons/businesses/${id}.svg`
}

export function producerCategory(def: ProducerDef): 'legal' | 'illegal' | ProducerCategory {
  if (def.category) return def.category
  if (def.illegal) return 'illegal'
  return 'legal'
}

export function producersByCategory(category: 'legal' | 'illegal' | ProducerCategory | 'all'): ProducerDef[] {
  if (category === 'all') return PRODUCERS
  return PRODUCERS.filter((p) => producerCategory(p) === category)
}

export function formatMoney(value: number): string {
  const v = Math.max(0, value)
  if (v < 1000) {
    if (v < 10) return v.toFixed(1)
    return Math.floor(v).toLocaleString('tr-TR')
  }
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0)}K`
  if (v < 1_000_000_000) return `${(v / 1_000_000).toFixed(v < 10_000_000 ? 1 : 0)}M`
  if (v < 1_000_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  return `${(v / 1_000_000_000_000).toFixed(1)}T`
}

/** Pasif gelir hızı — 1 gerçek sn = 1 oyun günü */
export function formatIncomeRate(value: number): string {
  const v = Math.max(0, value)
  if (v <= 0) return '0/sn'
  return `${formatMoney(v)}/sn`
}

/** Açıklamalı gelir satırı (finans paneli) */
export function formatIncomeRateHint(value: number): string {
  if (value <= 0) return 'Pasif gelir yok'
  return `${formatIncomeRate(value)} pasif (tıklama ayrı)`
}
