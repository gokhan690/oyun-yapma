import { producerEconomyMult, producerCostExtraMult, type ProducerDef } from './Economy'

/**
 * Kategoriye özel firma geliştirme türleri (Karar 8-10).
 * Her sektörün kendi geliştirme ağacı var — stratejik çeşitlilik.
 * Firma seviyesinden (FirmLevels) farklı: bunlar tek seferlik, kalıcı yükseltmeler.
 */

export type FirmTrack =
  | 'general'
  | 'tech'
  | 'finance'
  | 'luxury'
  | 'sport'
  | 'politics'
  | 'illegal'

export interface FirmUpgradeDef {
  id: string
  name: string
  emoji: string
  description: string
  incomeBonus: number
  costMult: number
  heatBonus?: number
}

export const FIRM_UPGRADE_TRACKS: Record<FirmTrack, FirmUpgradeDef[]> = {
  general: [
    { id: 'kalite', name: 'Kalite Artır', emoji: '⭐', description: 'Ürün/hizmet kalitesini yükselt', incomeBonus: 0.15, costMult: 0.10 },
    { id: 'personel', name: 'Personel Eğitimi', emoji: '🎓', description: 'Çalışanları eğit, verim artsın', incomeBonus: 0.20, costMult: 0.20 },
    { id: 'tedarik', name: 'Tedarik Anlaşması', emoji: '🤝', description: 'Maliyet düşür, marj artsın', incomeBonus: 0.30, costMult: 0.36 },
  ],
  tech: [
    { id: 'arge', name: 'Ar-Ge Yatırımı', emoji: '🔬', description: 'Araştırma ile ürün geliştir', incomeBonus: 0.20, costMult: 0.14 },
    { id: 'otomasyon', name: 'Otomasyon', emoji: '🤖', description: 'Süreçleri otomatikleştir', incomeBonus: 0.30, costMult: 0.30 },
    { id: 'abonelik', name: 'Abonelik Modeli', emoji: '🔁', description: 'Tekrarlayan gelir kur', incomeBonus: 0.25, costMult: 0.30 },
  ],
  finance: [
    { id: 'analiz', name: 'Veri Analizi', emoji: '📊', description: 'Yatırım kararlarını iyileştir', incomeBonus: 0.20, costMult: 0.14 },
    { id: 'risk', name: 'Risk Yönetimi', emoji: '🛡️', description: 'Kayıpları azalt, getiriyi koru', incomeBonus: 0.28, costMult: 0.31 },
  ],
  luxury: [
    { id: 'premium', name: 'Premium Hizmet', emoji: '💎', description: 'Üst segment müşteri kazan', incomeBonus: 0.25, costMult: 0.19 },
    { id: 'marka', name: 'Marka Değeri', emoji: '👑', description: 'Prestij ve fiyat gücü artır', incomeBonus: 0.35, costMult: 0.39 },
  ],
  sport: [
    { id: 'sponsor', name: 'Sponsorluk', emoji: '🤝', description: 'Sponsor gelirleri ekle', incomeBonus: 0.20, costMult: 0.14 },
    { id: 'taraftar', name: 'Taraftar Tabanı', emoji: '📣', description: 'Bilet/ürün satışını büyüt', incomeBonus: 0.30, costMult: 0.33 },
  ],
  politics: [
    { id: 'lobi', name: 'Lobi Gücü', emoji: '🏛️', description: 'Düzenleme avantajı sağla', incomeBonus: 0.20, costMult: 0.14 },
    { id: 'nufuz', name: 'Nüfuz Ağı', emoji: '🕸️', description: 'İlişki ağını genişlet', incomeBonus: 0.30, costMult: 0.33 },
  ],
  illegal: [
    { id: 'karaborsa', name: 'Karaborsa Ağı', emoji: '🕳️', description: 'Yüksek gelir ama daha çok heat', incomeBonus: 0.40, costMult: 0.24, heatBonus: 8 },
    { id: 'aklama', name: 'Kara Para Aklama', emoji: '🪙', description: 'Geliri temizle, marjı koru', incomeBonus: 0.30, costMult: 0.30, heatBonus: 4 },
  ],
}

export function firmTrack(def: ProducerDef): FirmTrack {
  if (def.illegal) return 'illegal'
  switch (def.category) {
    case 'finance': return 'finance'
    case 'science': return 'tech'
    case 'luxury': return 'luxury'
    case 'sport': return 'sport'
    case 'politics': return 'politics'
    default: return 'general'
  }
}

export function firmUpgradesForProducer(def: ProducerDef): FirmUpgradeDef[] {
  return FIRM_UPGRADE_TRACKS[firmTrack(def)]
}

export function firmUpgradeDef(def: ProducerDef, upgradeId: string): FirmUpgradeDef | null {
  return firmUpgradesForProducer(def).find((u) => u.id === upgradeId) ?? null
}

export function firmUpgradeIncomeBonus(def: ProducerDef, purchased: string[]): number {
  if (!purchased || purchased.length === 0) return 0
  const list = firmUpgradesForProducer(def)
  let bonus = 0
  for (const u of list) {
    if (purchased.includes(u.id)) bonus += u.incomeBonus
  }
  return bonus
}

export function firmUpgradeHeatBonus(def: ProducerDef, purchased: string[]): number {
  if (!def.illegal || !purchased || purchased.length === 0) return 0
  const list = firmUpgradesForProducer(def)
  let heat = 0
  for (const u of list) {
    if (purchased.includes(u.id) && u.heatBonus) heat += u.heatBonus
  }
  return heat
}

export function firmUpgradeCost(def: ProducerDef, upgrade: FirmUpgradeDef, owned: number): number {
  return Math.floor(
    def.baseCost *
    producerEconomyMult(def) *
    producerCostExtraMult(def) *
    upgrade.costMult *
    Math.max(1, owned)
  )
}
