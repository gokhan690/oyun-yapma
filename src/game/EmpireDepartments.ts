import { requiredDomainText } from '../i18n'

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
  bonusPerLevel: string
  unlockAt: number
  taskLabel: string
}

export const DEPARTMENT_MAX_LEVEL = 10

export const DEPARTMENTS: DepartmentDef[] = [
  { id: 'operasyon', name: 'Operasyon', emoji: '⚙️', description: 'Legal op.', bonusPerLevel: 'Legal gelir +%2/seviye', unlockAt: 0, taskLabel: '5 isletmeyi Lv.2+ yap' },
  { id: 'finans', name: 'Finans', emoji: '📈', description: 'Sermaye.', bonusPerLevel: 'Finans +%3/seviye', unlockAt: 100_000, taskLabel: '500k net' },
  { id: 'pazarlama', name: 'Pazarlama', emoji: '📣', description: 'Marka.', bonusPerLevel: 'Tum gelir +%1.5/seviye', unlockAt: 50_000, taskLabel: '10 isletme' },
  { id: 'hukuk', name: 'Hukuk', emoji: '⚖️', description: 'Ceza riskini azaltir.', bonusPerLevel: 'Baskin cezasi -%3/seviye', unlockAt: 200_000, taskLabel: 'Heat<30' },
  { id: 'arge', name: 'Ar-Ge', emoji: '🔬', description: 'Arastirma.', bonusPerLevel: 'Arastirma +%2/seviye', unlockAt: 500_000, taskLabel: '3 dugum' },
  { id: 'lojistik', name: 'Lojistik', emoji: '🚚', description: 'Maliyet.', bonusPerLevel: 'Maliyet -%1/seviye', unlockAt: 1_000_000, taskLabel: '20 isletme' },
  { id: 'guvenlik', name: 'Guvenlik', emoji: '🛡️', description: 'Rakip koruma.', bonusPerLevel: 'Rakip hasari -%3/seviye', unlockAt: 5_000_000, taskLabel: '1 anlasma' },
  { id: 'aile_ofisi', name: 'Aile Ofisi', emoji: '👨‍👩‍👧', description: 'Miras.', bonusPerLevel: 'Miras +%2/seviye', unlockAt: 10_000_000, taskLabel: 'Vasiyet' },
]

export function departmentDef(id: DepartmentId): DepartmentDef {
  return DEPARTMENTS.find((d) => d.id === id) ?? DEPARTMENTS[0]!
}

export function departmentName(d: DepartmentDef): string {
  return requiredDomainText(`dept_${d.id}_name`)
}
export function departmentDesc(d: DepartmentDef): string {
  return requiredDomainText(`dept_${d.id}_desc`)
}
export function departmentBonus(d: DepartmentDef): string {
  return requiredDomainText(`dept_${d.id}_bonus`)
}
export function departmentTask(d: DepartmentDef): string {
  return requiredDomainText(`dept_${d.id}_task`)
}

export function departmentUpgradeCost(id: DepartmentId, currentLevel: number): number {
  if (currentLevel >= DEPARTMENT_MAX_LEVEL) return Infinity
  const def = departmentDef(id)
  const base = Math.max(10_000, def.unlockAt * 0.1 + 10_000)
  return Math.floor(base * Math.pow(1.8, currentLevel))
}

export function operasyonLegalBonus(level: number): number { return 0.02 * level }
export function finansProducerBonus(level: number): number { return 0.03 * level }
export function pazarlamaGlobalBonus(level: number): number { return 0.015 * level }
export function hukukRaidReduction(level: number): number { return Math.min(0.45, 0.03 * level) }
export function argeBonus(level: number): number { return 0.02 * level }
export function lojistikCostReduction(level: number): number { return Math.min(0.30, 0.01 * level) }
export function guvenlikRivalReduction(level: number): number { return Math.min(0.45, 0.03 * level) }
export function aileOfisiInheritanceBonus(level: number): number { return 0.02 * level }

export function createDepartmentState(): Record<DepartmentId, number> {
  return { operasyon: 0, finans: 0, pazarlama: 0, hukuk: 0, arge: 0, lojistik: 0, guvenlik: 0, aile_ofisi: 0 }
}

export function isDepartmentTaskComplete(
  id: DepartmentId,
  ctx: { leveledFirms: number; netWorth: number; ownedBusinesses: number; heat: number; researchNodes: number; rivalDeals: number; hasWill: boolean },
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
