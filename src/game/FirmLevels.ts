import type { ProducerDef } from './Economy'

/**
 * Firma seviye sistemi (Karar 7-9): tıklama yerine işletme geliştirme.
 * Her firma 1→5 seviye alır; her seviye gelir bonusu verir, maliyeti artar.
 */

export const FIRM_MAX_LEVEL = 5

/** Seviye başına kümülatif gelir çarpanı (Lv1 = baz) */
const LEVEL_INCOME_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.10,
  3: 1.25,
  4: 1.45,
  5: 1.70,
}

/** Firma seviyesinin gelir çarpanı */
export function firmLevelIncomeMult(level: number): number {
  const lv = Math.max(1, Math.min(FIRM_MAX_LEVEL, Math.floor(level)))
  return LEVEL_INCOME_MULT[lv] ?? 1
}

/** Bir sonraki seviyenin etiketi (UI) */
export function firmLevelBonusLabel(nextLevel: number): string {
  const lv = Math.max(2, Math.min(FIRM_MAX_LEVEL, nextLevel))
  const pct = Math.round((LEVEL_INCOME_MULT[lv]! - 1) * 100)
  if (lv === FIRM_MAX_LEVEL) return `Maks seviye · +%${pct} gelir + özel bonus`
  return `+%${pct} toplam gelir`
}

/**
 * Bir firmayı bir seviye yükseltmenin maliyeti.
 * Sahip olunan adet ve mevcut seviyeye göre ölçeklenir.
 */
export function firmLevelUpCost(def: ProducerDef, currentLevel: number, owned: number): number {
  const nextLevel = currentLevel + 1
  if (nextLevel > FIRM_MAX_LEVEL) return Infinity
  // Temel: işletmenin baz maliyetinin katı, adet ve seviyeyle artar
  const base = def.baseCost * Math.max(1, owned) * 0.8
  const levelScale = Math.pow(2.4, currentLevel)
  return Math.floor(base * levelScale)
}

/** Firma maks seviyede mi? */
export function isFirmMaxLevel(level: number): boolean {
  return level >= FIRM_MAX_LEVEL
}
