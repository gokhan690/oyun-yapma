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
  { id: 'stajyer', name: 'Limonata Tezgahı', emoji: '🍋', description: 'Küçük ama cesur bir girişim.', tier: 1, unlockAt: 0, baseCost: 20, baseIncome: 0.04, costMultiplier: 1.22 },
  { id: 'robot', name: 'E-ticaret Sitesi', emoji: '🛒', description: 'Online satışlar başladı.', tier: 2, unlockAt: 500, baseCost: 150, baseIncome: 0.35, costMultiplier: 1.22 },
  { id: 'ofis', name: 'Restoran Zinciri', emoji: '🍽️', description: 'Lezzetli büyüme.', tier: 3, unlockAt: 5_000, baseCost: 750, baseIncome: 1.4, costMultiplier: 1.22 },
  { id: 'fabrika', name: 'Lojistik Merkezi', emoji: '🚚', description: 'Tedarik zinciri güçleniyor.', tier: 4, unlockAt: 50_000, baseCost: 4_500, baseIncome: 5.5, costMultiplier: 1.22 },
  { id: 'holding', name: 'Yazılım Şirketi', emoji: '💻', description: 'Teknoloji imparatorluğu.', tier: 5, unlockAt: 2_000_000, baseCost: 22_000, baseIncome: 22, costMultiplier: 1.22 },
  { id: 'uzay', name: 'Gayrimenkul Portföyü', emoji: '🏙️', description: 'Arsa ve bina yatırımları.', tier: 6, unlockAt: 15_000_000, baseCost: 150_000, baseIncome: 90, costMultiplier: 1.22 },
  { id: 'ai', name: 'Holding Birleşmesi', emoji: '🤝', description: 'Rakiplerle stratejik birleşme.', tier: 7, unlockAt: 150_000_000, baseCost: 750_000, baseIncome: 360, costMultiplier: 1.22 },
  { id: 'tuzaq', name: 'Borsa IPO', emoji: '📈', description: 'Halka arz — zirve noktası.', tier: 8, unlockAt: 2_000_000_000, baseCost: 4_000_000, baseIncome: 1400, costMultiplier: 1.22 },
  { id: 'uydu', name: 'Uydu İnternet Ağı', emoji: '🛰️', description: 'Küresel bağlantı imparatorluğu.', tier: 9, unlockAt: 15_000_000_000, baseCost: 25_000_000, baseIncome: 5200, costMultiplier: 1.22 },
  { id: 'merkezbankasi', name: 'Küresel Merkez Bankası', emoji: '🏦', description: 'Para basan makine.', tier: 10, unlockAt: 150_000_000_000, baseCost: 150_000_000, baseIncome: 21000, costMultiplier: 1.22 },
  { id: 'galaksiyum', name: 'Galaktik Tekno-İmparatorluk', emoji: '🌌', description: 'Evreni avucunun içine aldın.', tier: 11, unlockAt: 1_500_000_000_000, baseCost: 1_500_000_000, baseIncome: 85000, costMultiplier: 1.22 },
]

export const UPGRADES: UpgradeDef[] = [
  { id: 'click_x2', name: 'Pazarlama Kampanyası', description: 'Tıklama geliri x2', cost: 100, effect: 'click_mult', value: 2 },
  { id: 'click_x5', name: 'Viral Reklam', description: 'Tıklama geliri x5', cost: 1_000, effect: 'click_mult', value: 5 },
  { id: 'global_x2', name: 'Kurumsal Büyüme', description: 'Tüm gelir x2', cost: 4_000, effect: 'global_mult', value: 2 },
  { id: 'stajyer_x2', name: 'Franchise Sistemi', description: 'Limonata geliri x2', cost: 200, effect: 'producer_mult', value: 2, producerId: 'stajyer' },
  { id: 'robot_x2', name: 'SEO Optimizasyonu', description: 'E-ticaret geliri x2', cost: 1_600, effect: 'producer_mult', value: 2, producerId: 'robot' },
  { id: 'fabrika_x2', name: 'Depo Otomasyonu', description: 'Lojistik geliri x2', cost: 20_000, effect: 'producer_mult', value: 2, producerId: 'fabrika' },
  { id: 'holding_x2', name: 'Bulut Altyapısı', description: 'Yazılım geliri x2', cost: 100_000, effect: 'producer_mult', value: 2, producerId: 'holding' },
  { id: 'ofis_x2', name: 'Franchise Genişlemesi', description: 'Restoran geliri x2', cost: 10_000, effect: 'producer_mult', value: 2, producerId: 'ofis' },
  { id: 'uzay_x2', name: 'Portföy Yönetimi', description: 'Gayrimenkul geliri x2', cost: 400_000, effect: 'producer_mult', value: 2, producerId: 'uzay' },
  { id: 'ai_x2', name: 'Birleşme Sinergisi', description: 'Holding geliri x2', cost: 2_000_000, effect: 'producer_mult', value: 2, producerId: 'ai' },
  { id: 'tuzaq_x2', name: 'Halka Arz Boost', description: 'IPO geliri x2', cost: 10_000_000, effect: 'producer_mult', value: 2, producerId: 'tuzaq' },
  { id: 'global_x3', name: 'Global Expansion', description: 'Tüm gelir x1.5', cost: 200_000, effect: 'global_mult', value: 1.5 },
  { id: 'uydu_x2', name: 'Orbital Verimlilik', description: 'Uydu ağı geliri x2', cost: 60_000_000, effect: 'producer_mult', value: 2, producerId: 'uydu' },
  { id: 'merkezbankasi_x2', name: 'Para Politikası', description: 'Merkez bankası geliri x2', cost: 400_000_000, effect: 'producer_mult', value: 2, producerId: 'merkezbankasi' },
  { id: 'global_mega', name: 'Süper Büyüme', description: 'Tüm gelir x2', cost: 20_000_000, effect: 'global_mult', value: 2 },
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
