/**
 * İmparatorluk departman sistemi (Karar 11-13).
 * Patron olduktan sonra oyunun ana yönetim merkezi.
 * Her departman 1-10 seviye; küçük ama kalıcı bonuslar + görevler.
 */

export type DepartmentId =
  | 'operasyon'
  | 'finans'
  | 'pazarlama'
  | 'hukuk'
  | 'arge'
  | 'lojistik'
  | 'guvenlik'
  | 'aile_ofisi'

export interface DepartmentDef {
  id: DepartmentId
  name: string
  emoji: string
  description: string
  /** Seviye başına bonus etiketi */
  bonusPerLevel: string
  /** Açılması için gereken toplam kazanç */
  unlockAt: number
  /** Görev açıklaması (Karar 13) */
  taskLabel: string
}

export const DEPARTMENT_MAX_LEVEL = 10

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 'operasyon', name: 'Operasyon', emoji: '⚙️',
    description: 'İşletme operasyonlarını yönetir.',
    bonusPerLevel: 'Legal gelir +%2/seviye',
    unlockAt: 0,
    taskLabel: '5 işletmeyi Lv.2+ yap',
  },
  {
    id: 'finans', name: 'Finans', emoji: '📈',
    description: 'Sermaye ve yatırım yönetimi.',
    bonusPerLevel: 'Finans firma geliri +%3/seviye',
    unlockAt: 100_000,
    taskLabel: '500.000₺ net değere ulaş',
  },
  {
    id: 'pazarlama', name: 'Pazarlama', emoji: '📣',
    description: 'Marka ve müşteri kazanımı.',
    bonusPerLevel: 'Tüm gelir +%1.5/seviye',
    unlockAt: 50_000,
    taskLabel: '10 işletme sahibi ol',
  },
  {
    id: 'hukuk', name: 'Hukuk', emoji: '⚖️',
    description: 'Ceza ve baskın riskini azaltır.',
    bonusPerLevel: 'Baskın cezası -%3/seviye',
    unlockAt: 200_000,
    taskLabel: 'Heat\'i 30 altına indir',
  },
  {
    id: 'arge', name: 'Ar-Ge', emoji: '🔬',
    description: 'Araştırma ve verimlilik.',
    bonusPerLevel: 'Pasif/araştırma +%2/seviye',
    unlockAt: 500_000,
    taskLabel: '3 araştırma düğümü al',
  },
  {
    id: 'lojistik', name: 'Lojistik', emoji: '🚚',
    description: 'Tedarik ve maliyet optimizasyonu.',
    bonusPerLevel: 'İşletme maliyeti -%1/seviye',
    unlockAt: 1_000_000,
    taskLabel: '20 işletme sahibi ol',
  },
  {
    id: 'guvenlik', name: 'Güvenlik', emoji: '🛡️',
    description: 'Rakip saldırılarına karşı korur.',
    bonusPerLevel: 'Rakip hasarı -%3/seviye',
    unlockAt: 5_000_000,
    taskLabel: '1 rakiple anlaşma yap',
  },
  {
    id: 'aile_ofisi', name: 'Aile Ofisi', emoji: '👨‍👩‍👧',
    description: 'Servet ve miras koruması.',
    bonusPerLevel: 'Miras koruması +%2/seviye',
    unlockAt: 10_000_000,
    taskLabel: 'Vasiyet hazırla',
  },
]

export function departmentDef(id: DepartmentId): DepartmentDef {
  return DEPARTMENTS.find((d) => d.id === id) ?? DEPARTMENTS[0]!
}

/** Bir departmanı bir seviye yükseltme maliyeti */
export function departmentUpgradeCost(id: DepartmentId, currentLevel: number): number {
  if (currentLevel >= DEPARTMENT_MAX_LEVEL) return Infinity
  const def = departmentDef(id)
  const base = Math.max(10_000, def.unlockAt * 0.1 + 10_000)
  return Math.floor(base * Math.pow(1.8, currentLevel))
}

// —— Bonus hesaplayıcıları (seviye → çarpan/oran) ——

export function operasyonLegalBonus(level: number): number {
  return 0.02 * level
}
export function finansProducerBonus(level: number): number {
  return 0.03 * level
}
export function pazarlamaGlobalBonus(level: number): number {
  return 0.015 * level
}
export function hukukRaidReduction(level: number): number {
  return Math.min(0.45, 0.03 * level)
}
export function argeBonus(level: number): number {
  return 0.02 * level
}
export function lojistikCostReduction(level: number): number {
  return Math.min(0.30, 0.01 * level)
}
export function guvenlikRivalReduction(level: number): number {
  return Math.min(0.45, 0.03 * level)
}
export function aileOfisiInheritanceBonus(level: number): number {
  return 0.02 * level
}

export function createDepartmentState(): Record<DepartmentId, number> {
  return {
    operasyon: 0, finans: 0, pazarlama: 0, hukuk: 0,
    arge: 0, lojistik: 0, guvenlik: 0, aile_ofisi: 0,
  }
}

/** Departman görevi tamamlandı mı? (Karar 13) */
export function isDepartmentTaskComplete(
  id: DepartmentId,
  ctx: {
    leveledFirms: number
    netWorth: number
    ownedBusinesses: number
    heat: number
    researchNodes: number
    rivalDeals: number
    hasWill: boolean
  },
): boolean {
  switch (id) {
    case 'operasyon': return ctx.leveledFirms >= 5
    case 'finans': return ctx.netWorth >= 500_000
    case 'pazarlama': return ctx.ownedBusinesses >= 10
    case 'hukuk': return ctx.heat < 30
    case 'arge': return ctx.researchNodes >= 3
    case 'lojistik': return ctx.ownedBusinesses >= 20
    case 'guvenlik': return ctx.rivalDeals >= 1
    case 'aile_ofisi': return ctx.hasWill
    default: return false
  }
}
