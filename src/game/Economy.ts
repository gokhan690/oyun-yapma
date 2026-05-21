export interface ProducerDef {
  id: string
  name: string
  emoji: string
  description: string
  tier: number
  unlockAt: number
  baseCost: number
  baseIncome: number
  costMultiplier: number
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
  { id: 'stajyer', name: 'Limonata Tezgahı', emoji: '🍋', description: 'Küçük ama cesur bir girişim.', tier: 1, unlockAt: 0, baseCost: 15, baseIncome: 0.06, costMultiplier: 1.2 },
  { id: 'robot', name: 'E-ticaret Sitesi', emoji: '🛒', description: 'Online satışlar başladı.', tier: 2, unlockAt: 200, baseCost: 100, baseIncome: 0.56, costMultiplier: 1.2 },
  { id: 'ofis', name: 'Restoran Zinciri', emoji: '🍽️', description: 'Lezzetli büyüme.', tier: 3, unlockAt: 2000, baseCost: 500, baseIncome: 2.24, costMultiplier: 1.2 },
  { id: 'fabrika', name: 'Lojistik Merkezi', emoji: '🚚', description: 'Tedarik zinciri güçleniyor.', tier: 4, unlockAt: 20000, baseCost: 3000, baseIncome: 8.4, costMultiplier: 1.2 },
  { id: 'holding', name: 'Yazılım Şirketi', emoji: '💻', description: 'Teknoloji imparatorluğu.', tier: 5, unlockAt: 1_000_000, baseCost: 15000, baseIncome: 33.6, costMultiplier: 1.2 },
  { id: 'uzay', name: 'Gayrimenkul Portföyü', emoji: '🏙️', description: 'Arsa ve bina yatırımları.', tier: 6, unlockAt: 8_000_000, baseCost: 100000, baseIncome: 140, costMultiplier: 1.2 },
  { id: 'ai', name: 'Holding Birleşmesi', emoji: '🤝', description: 'Rakiplerle stratejik birleşme.', tier: 7, unlockAt: 80_000_000, baseCost: 500000, baseIncome: 560, costMultiplier: 1.2 },
  { id: 'tuzaq', name: 'Borsa IPO', emoji: '📈', description: 'Halka arz — zirve noktası.', tier: 8, unlockAt: 1_000_000_000, baseCost: 2500000, baseIncome: 2240, costMultiplier: 1.2 },
  { id: 'uydu', name: 'Uydu İnternet Ağı', emoji: '🛰️', description: 'Küresel bağlantı imparatorluğu.', tier: 9, unlockAt: 8_000_000_000, baseCost: 15000000, baseIncome: 8400, costMultiplier: 1.2 },
  { id: 'merkezbankasi', name: 'Küresel Merkez Bankası', emoji: '🏦', description: 'Para basan makine.', tier: 10, unlockAt: 80_000_000_000, baseCost: 100000000, baseIncome: 33600, costMultiplier: 1.2 },
  { id: 'galaksiyum', name: 'Galaktik Tekno-İmparatorluk', emoji: '🌌', description: 'Evreni avucunun içine aldın.', tier: 11, unlockAt: 800_000_000_000, baseCost: 1_000_000_000, baseIncome: 140000, costMultiplier: 1.2 },
]

export const UPGRADES: UpgradeDef[] = [
  { id: 'click_x2', name: 'Pazarlama Kampanyası', description: 'Tıklama geliri x2', cost: 75, effect: 'click_mult', value: 2 },
  { id: 'click_x5', name: 'Viral Reklam', description: 'Tıklama geliri x5', cost: 750, effect: 'click_mult', value: 5 },
  { id: 'global_x2', name: 'Kurumsal Büyüme', description: 'Tüm gelir x2', cost: 3000, effect: 'global_mult', value: 2 },
  { id: 'stajyer_x2', name: 'Franchise Sistemi', description: 'Limonata geliri x2', cost: 150, effect: 'producer_mult', value: 2, producerId: 'stajyer' },
  { id: 'robot_x2', name: 'SEO Optimizasyonu', description: 'E-ticaret geliri x2', cost: 1200, effect: 'producer_mult', value: 2, producerId: 'robot' },
  { id: 'fabrika_x2', name: 'Depo Otomasyonu', description: 'Lojistik geliri x2', cost: 15000, effect: 'producer_mult', value: 2, producerId: 'fabrika' },
  { id: 'holding_x2', name: 'Bulut Altyapısı', description: 'Yazılım geliri x2', cost: 75000, effect: 'producer_mult', value: 2, producerId: 'holding' },
  { id: 'ofis_x2', name: 'Franchise Genişlemesi', description: 'Restoran geliri x2', cost: 7500, effect: 'producer_mult', value: 2, producerId: 'ofis' },
  { id: 'uzay_x2', name: 'Portföy Yönetimi', description: 'Gayrimenkul geliri x2', cost: 300000, effect: 'producer_mult', value: 2, producerId: 'uzay' },
  { id: 'ai_x2', name: 'Birleşme Sinergisi', description: 'Holding geliri x2', cost: 1500000, effect: 'producer_mult', value: 2, producerId: 'ai' },
  { id: 'tuzaq_x2', name: 'Halka Arz Boost', description: 'IPO geliri x2', cost: 7500000, effect: 'producer_mult', value: 2, producerId: 'tuzaq' },
  { id: 'global_x3', name: 'Global Expansion', description: 'Tüm gelir x1.5', cost: 150000, effect: 'global_mult', value: 1.5 },
  { id: 'uydu_x2', name: 'Orbital Verimlilik', description: 'Uydu ağı geliri x2', cost: 45_000_000, effect: 'producer_mult', value: 2, producerId: 'uydu' },
  { id: 'merkezbankasi_x2', name: 'Para Politikası', description: 'Merkez bankası geliri x2', cost: 300_000_000, effect: 'producer_mult', value: 2, producerId: 'merkezbankasi' },
  { id: 'global_mega', name: 'Süper Büyüme', description: 'Tüm gelir x2', cost: 15_000_000, effect: 'global_mult', value: 2 },
]

export function producerCost(def: ProducerDef, owned: number, count = 1): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(def.baseCost * Math.pow(def.costMultiplier, owned + i))
  }
  return total
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

export function isProducerUnlocked(def: ProducerDef, totalEarned: number): boolean {
  return totalEarned >= def.unlockAt
}

export function producerIconPath(id: string): string {
  return `/icons/businesses/${id}.svg`
}

export function formatMoney(value: number): string {
  const v = Math.max(0, value)
  if (v < 1000) {
    if (v < 10) return v.toFixed(2)
    if (v < 100) return v.toFixed(1)
    return Math.floor(v).toLocaleString('tr-TR')
  }
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 2 : 1)}K`
  if (v < 1_000_000_000) return `${(v / 1_000_000).toFixed(v < 10_000_000 ? 2 : 1)}M`
  if (v < 1_000_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  return `${(v / 1_000_000_000_000).toFixed(2)}T`
}
